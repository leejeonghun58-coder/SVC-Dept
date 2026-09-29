import type { Readable } from "node:stream";

import { SaxesParser, type SaxesTagPlain } from "saxes";
import { Parse, type Entry } from "unzipper";

export type PivotCacheMetadata = {
  recordCount: number;
  sourceSheet: string | null;
  sourceRef: string | null;
  fieldNames: string[];
  sharedItems: string[][];
};

const DEFINITION_PATH = "xl/pivotCache/pivotCacheDefinition1.xml";
const RECORDS_PATH = "xl/pivotCache/pivotCacheRecords1.xml";

function localName(name: string) {
  return name.includes(":") ? name.slice(name.indexOf(":") + 1) : name;
}

function attribute(tag: SaxesTagPlain, name: string) {
  return tag.attributes[name];
}

function literal(tag: SaxesTagPlain) {
  const name = localName(tag.name);
  const value = attribute(tag, "v") ?? "";
  if (name === "m") return "";
  if (name === "b") return value === "1" ? "true" : "false";
  return value;
}

async function parseDefinition(entry: Entry): Promise<PivotCacheMetadata> {
  const metadata: PivotCacheMetadata = {
    recordCount: 0,
    sourceSheet: null,
    sourceRef: null,
    fieldNames: [],
    sharedItems: [],
  };
  let currentField = -1;
  let insideSharedItems = false;
  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (tag) => {
    const name = localName(tag.name);
    if (name === "pivotCacheDefinition") {
      metadata.recordCount = Number(attribute(tag, "recordCount") ?? "0");
    } else if (name === "worksheetSource") {
      metadata.sourceSheet = attribute(tag, "sheet") ?? null;
      metadata.sourceRef = attribute(tag, "ref") ?? null;
    } else if (name === "cacheField") {
      currentField += 1;
      metadata.fieldNames.push(attribute(tag, "name") ?? "");
      metadata.sharedItems.push([]);
    } else if (name === "sharedItems") {
      insideSharedItems = true;
    } else if (insideSharedItems && currentField >= 0 && ["s", "n", "b", "d", "m"].includes(name)) {
      metadata.sharedItems[currentField].push(literal(tag));
    }
  });
  parser.on("closetag", (tag) => {
    if (localName(tag.name) === "sharedItems") insideSharedItems = false;
  });
  for await (const chunk of entry) parser.write(chunk.toString("utf8"));
  parser.close();
  return metadata;
}

async function* parseRecords(
  entry: Entry,
  metadata: PivotCacheMetadata,
): AsyncGenerator<string[]> {
  const completed: string[][] = [];
  let row: string[] | null = null;
  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (tag) => {
    const name = localName(tag.name);
    if (name === "r") {
      row = [];
      return;
    }
    if (!row || !["x", "s", "n", "b", "d", "m"].includes(name)) return;
    if (name === "x") {
      const fieldIndex = row.length;
      const sharedIndex = Number(attribute(tag, "v") ?? "0");
      row.push(metadata.sharedItems[fieldIndex]?.[sharedIndex] ?? "");
    } else {
      row.push(literal(tag));
    }
  });
  parser.on("closetag", (tag) => {
    if (localName(tag.name) === "r" && row) {
      completed.push(row);
      row = null;
    }
  });

  for await (const chunk of entry) {
    parser.write(chunk.toString("utf8"));
    while (completed.length > 0) yield completed.shift()!;
  }
  parser.close();
  while (completed.length > 0) yield completed.shift()!;
}

export async function* readPivotCacheRows(
  stream: Readable,
): AsyncGenerator<{ metadata: PivotCacheMetadata; rowNumber: number; values: string[] }> {
  const archive = stream.pipe(Parse({ forceStream: true }));
  let metadata: PivotCacheMetadata | null = null;
  let rowNumber = 1;

  for await (const candidate of archive as unknown as AsyncIterable<Entry>) {
    const entry = candidate;
    if (entry.path === DEFINITION_PATH) {
      metadata = await parseDefinition(entry);
    } else if (entry.path === RECORDS_PATH) {
      if (!metadata) throw new Error("피벗 캐시 정의가 레코드보다 먼저 필요합니다.");
      for await (const values of parseRecords(entry, metadata)) {
        rowNumber += 1;
        yield { metadata, rowNumber, values };
      }
    } else {
      entry.autodrain();
    }
  }

  if (!metadata) throw new Error("지원하는 피벗 캐시 정의를 찾지 못했습니다.");
}
