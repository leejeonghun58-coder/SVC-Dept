import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { SaxesParser, type SaxesTagPlain } from "saxes";
import { Open, type File as ZipFile } from "unzipper";

import {
  parseBillingMonth,
  resolveHeader,
  type SourceMapping,
} from "./source-mapping";

export type SourceRow = {
  sourceRowNumber: number;
  values: ReadonlyMap<string, string>;
};

export type ShipmentInput = {
  sourceRowNumber: number;
  sourcePeriod: string;
  billingMonth: string | null;
  customerNo: string;
  customerName: string;
  itemNumber: string;
  itemDescription: string | null;
  quantity: string;
  unitCost: string | null;
  unitPrice: string | null;
  exactAmount: string | null;
  totalCost: string | null;
  category: string | null;
  subCategory: string | null;
  svcTeam: string | null;
  model: string | null;
  channel: string | null;
  currency: "KRW";
};

export type DvInput = {
  sourceRowNumber: number;
  sourcePeriod: string;
  billingMonth: string | null;
  customerNo: string;
  customerName: string;
  itemNumber: string;
  serialNo: string | null;
  totalDv: string;
  totalRevenue: string | null;
  currency: string | null;
  svcTeam: string | null;
  model: string | null;
  channel: string | null;
  equipmentMonthKey: string;
};

export class MissingRequiredColumnError extends Error {
  readonly code = "MISSING_REQUIRED_COLUMN";

  constructor(readonly columns: string[]) {
    super(`필수 열이 없습니다: ${columns.join(", ")}`);
    this.name = "MissingRequiredColumnError";
  }
}

function localName(name: string) {
  return name.includes(":") ? name.slice(name.indexOf(":") + 1) : name;
}

function attribute(tag: SaxesTagPlain, name: string) {
  return tag.attributes[name];
}

async function readSharedStrings(file: ZipFile | undefined) {
  if (!file) return [];
  const values: string[] = [];
  let insideItem = false;
  let insideText = false;
  let current = "";
  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (tag) => {
    const name = localName(tag.name);
    if (name === "si") {
      insideItem = true;
      current = "";
    } else if (insideItem && name === "t") {
      insideText = true;
    }
  });
  parser.on("text", (text) => {
    if (insideText) current += text;
  });
  parser.on("closetag", (tag) => {
    const name = localName(tag.name);
    if (name === "t") insideText = false;
    if (name === "si") {
      values.push(current);
      current = "";
      insideItem = false;
    }
  });
  for await (const chunk of file.stream()) parser.write(chunk.toString("utf8"));
  parser.close();
  return values;
}

type XmlRow = { rowNumber: number; cells: Map<number, string> };

function columnNumber(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "";
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result;
}

async function* streamXmlRows(
  file: ZipFile,
  sharedStrings: string[],
): AsyncGenerator<XmlRow> {
  const completed: XmlRow[] = [];
  let implicitRowNumber = 0;
  let currentRow: XmlRow | null = null;
  let currentColumn = 0;
  let currentType = "";
  let currentValue = "";
  let captureValue = false;
  const parser = new SaxesParser({ xmlns: false });

  parser.on("opentag", (tag) => {
    const name = localName(tag.name);
    if (name === "row") {
      implicitRowNumber += 1;
      const explicit = Number(attribute(tag, "r") ?? implicitRowNumber);
      implicitRowNumber = explicit;
      currentRow = { rowNumber: explicit, cells: new Map() };
    } else if (name === "c" && currentRow) {
      currentColumn = columnNumber(attribute(tag, "r") ?? "");
      currentType = attribute(tag, "t") ?? "";
      currentValue = "";
    } else if ((name === "v" || name === "t") && currentColumn > 0) {
      captureValue = true;
    }
  });
  parser.on("text", (text) => {
    if (captureValue) currentValue += text;
  });
  parser.on("closetag", (tag) => {
    const name = localName(tag.name);
    if (name === "v" || name === "t") captureValue = false;
    if (name === "c" && currentRow && currentColumn > 0) {
      const value = currentType === "s"
        ? sharedStrings[Number(currentValue)] ?? ""
        : currentType === "b"
          ? currentValue === "1" ? "true" : "false"
          : currentValue;
      currentRow.cells.set(currentColumn, value);
      currentColumn = 0;
      currentType = "";
      currentValue = "";
    }
    if (name === "row" && currentRow) {
      completed.push(currentRow);
      currentRow = null;
    }
  });

  for await (const chunk of file.stream()) {
    parser.write(chunk.toString("utf8"));
    while (completed.length > 0) yield completed.shift()!;
  }
  parser.close();
  while (completed.length > 0) yield completed.shift()!;
}

function requiredFields(mapping: SourceMapping) {
  return Object.entries(mapping.fields)
    .filter(([, definition]) => definition.required)
    .map(([field]) => field);
}

function headerColumns(mapping: SourceMapping, row: XmlRow) {
  const resolved = new Map<string, number>();
  for (const [column, text] of row.cells) {
    const field = resolveHeader(mapping, text);
    if (field && !resolved.has(field)) resolved.set(field, column);
  }
  return resolved;
}

export async function* streamWorksheetRows(
  stream: Readable,
  mapping: SourceMapping,
): AsyncGenerator<SourceRow> {
  const temporaryPath = join(tmpdir(), `ssda-workbook-${randomUUID()}.xlsx`);
  await pipeline(stream, createWriteStream(temporaryPath));
  try {
    const archive = await Open.file(temporaryPath);
    const sharedStrings = await readSharedStrings(
      archive.files.find((file) => file.path === "xl/sharedStrings.xml"),
    );
    const worksheets = archive.files
      .filter((file) => /^xl\/worksheets\/sheet\d+\.xml$/.test(file.path))
      .sort((left, right) => left.path.localeCompare(right.path, "en", { numeric: true }));
    const required = requiredFields(mapping);
    let closestMissing = [...required];

    for (const worksheet of worksheets) {
      let columns: Map<string, number> | null = null;
      for await (const row of streamXmlRows(worksheet, sharedStrings)) {
        if (!columns) {
          const candidate = headerColumns(mapping, row);
          const missing = required.filter((field) => !candidate.has(field));
          if (missing.length < closestMissing.length) closestMissing = missing;
          if (missing.length === 0) columns = candidate;
          continue;
        }
        const values = new Map<string, string>();
        for (const [field, column] of columns) {
          values.set(field, row.cells.get(column)?.trim() ?? "");
        }
        if ([...values.values()].every((value) => value === "")) continue;
        yield { sourceRowNumber: row.rowNumber, values };
      }
      if (columns) return;
    }
    throw new MissingRequiredColumnError(closestMissing);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

export function textValue(values: ReadonlyMap<string, string>, field: string) {
  const value = values.get(field)?.trim() ?? "";
  return value === "" ? null : value;
}

export function requiredText(values: ReadonlyMap<string, string>, field: string) {
  return textValue(values, field) ?? "";
}

export function decimalValue(
  values: ReadonlyMap<string, string>,
  field: string,
  required = false,
) {
  const source = textValue(values, field);
  if (source === null) return required ? "" : null;
  const normalized = source.replace(/,/g, "");
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)
    ? normalized
    : source;
}

export function canonicalBillingMonth(sourcePeriod: string) {
  try {
    return parseBillingMonth(sourcePeriod).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}
