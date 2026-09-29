import type { Readable } from "node:stream";

import {
  canonicalBillingMonth,
  decimalValue,
  requiredText,
  streamWorksheetRows,
  textValue,
  type DvInput,
  type SourceRow,
} from "./common";
import { readPivotCacheRows } from "./pivot-cache-reader";
import { resolveHeader, type SourceMapping } from "./source-mapping";

type DvParserOptions = { source?: "worksheet" | "pivot-cache" };

function toDvInput(row: SourceRow): DvInput {
  const sourcePeriod = requiredText(row.values, "billingMonth");
  const billingMonth = canonicalBillingMonth(sourcePeriod);
  const itemNumber = requiredText(row.values, "itemNumber");
  const serialNo = textValue(row.values, "serialNo");
  return {
    sourceRowNumber: row.sourceRowNumber,
    sourcePeriod,
    billingMonth,
    customerNo: requiredText(row.values, "customerNo"),
    customerName: requiredText(row.values, "customerName"),
    itemNumber,
    serialNo,
    totalDv: decimalValue(row.values, "totalDv", true) ?? "",
    totalRevenue: decimalValue(row.values, "totalRevenue"),
    currency: textValue(row.values, "currency"),
    svcTeam: textValue(row.values, "svcTeam"),
    model: textValue(row.values, "model"),
    channel: textValue(row.values, "channel"),
    equipmentMonthKey: `${billingMonth ?? sourcePeriod}\u001f${itemNumber}\u001f${serialNo ?? ""}`,
  };
}

async function* pivotRows(stream: Readable, mapping: SourceMapping) {
  let columns: Map<string, number> | null = null;
  for await (const record of readPivotCacheRows(stream)) {
    if (!columns) {
      columns = new Map<string, number>();
      record.metadata.fieldNames.forEach((header, index) => {
        const field = resolveHeader(mapping, header);
        if (field && !columns?.has(field)) columns?.set(field, index);
      });
      const missing = Object.entries(mapping.fields)
        .filter(([, definition]) => definition.required)
        .map(([field]) => field)
        .filter((field) => !columns?.has(field));
      if (missing.length > 0) {
        const { MissingRequiredColumnError } = await import("./common");
        throw new MissingRequiredColumnError(missing);
      }
    }
    const values = new Map<string, string>();
    for (const [field, index] of columns) values.set(field, record.values[index] ?? "");
    yield { sourceRowNumber: record.rowNumber, values } satisfies SourceRow;
  }
}

export async function* parseDvRows(
  stream: Readable,
  mapping: SourceMapping,
  options: DvParserOptions = {},
): AsyncGenerator<DvInput> {
  if (mapping.kind !== "dv") throw new Error("DV 매핑이 필요합니다.");
  const source = options.source === "pivot-cache"
    ? pivotRows(stream, mapping)
    : streamWorksheetRows(stream, mapping);
  for await (const row of source) yield toDvInput(row);
}
