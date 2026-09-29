import { describe, expect, it } from "vitest";

import { loadSourceMapping } from "./source-mapping";
import {
  bufferStream,
  dvPivotCacheFixture,
  dvWorksheetFixture,
} from "./import-fixtures";
import { parseDvRows } from "./dv-parser";

async function collect<T>(rows: AsyncIterable<T>) {
  const result: T[] = [];
  for await (const row of rows) result.push(row);
  return result;
}

describe("parseDvRows", () => {
  it("discovers a later header row and preserves duplicate and conflicting rows", async () => {
    const workbook = await dvWorksheetFixture();
    const rows = await collect(
      parseDvRows(bufferStream(workbook), loadSourceMapping("dv")),
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      sourceRowNumber: 3,
      billingMonth: "2025-04-01",
      customerNo: "C001",
      customerName: "고객 에이",
      itemNumber: "M-001",
      serialNo: "S-001",
      totalDv: "100.00",
      totalRevenue: "1234.50",
      currency: "KRW",
      equipmentMonthKey: "2025-04-01\u001fM-001\u001fS-001",
    });
    expect(rows.map((row) => row.totalDv)).toEqual(["100.00", "100.00", "120.00"]);
  });

  it("streams the verified second-year pivot-cache shape without dropping conflicts", async () => {
    const workbook = await dvPivotCacheFixture();
    const rows = await collect(
      parseDvRows(bufferStream(workbook), loadSourceMapping("dv"), {
        source: "pivot-cache",
      }),
    );

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.totalDv)).toEqual(["10.00", "10.00", "12.00"]);
    expect(rows[0]).toMatchObject({
      billingMonth: "2024-04-01",
      customerNo: "C001",
      itemNumber: "M-001",
      serialNo: "S-001",
      totalRevenue: "20.50",
      currency: "KRW",
    });
  });
});
