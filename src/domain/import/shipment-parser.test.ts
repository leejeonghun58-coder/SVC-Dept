import { describe, expect, it } from "vitest";

import { loadSourceMapping } from "./source-mapping";
import {
  bufferStream,
  shipmentMissingColumnFixture,
  shipmentWorksheetFixture,
} from "./import-fixtures";
import { MissingRequiredColumnError, parseShipmentRows } from "./shipment-parser";

async function collect<T>(rows: AsyncIterable<T>) {
  const result: T[] = [];
  for await (const row of rows) result.push(row);
  return result;
}

describe("parseShipmentRows", () => {
  it("streams canonical rows, skips blanks, and preserves exact signed decimals", async () => {
    const workbook = await shipmentWorksheetFixture();
    const rows = await collect(
      parseShipmentRows(bufferStream(workbook), loadSourceMapping("shipment")),
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      sourceRowNumber: 2,
      billingMonth: "2024-04-01",
      customerNo: "C001",
      customerName: "고객 에이",
      itemNumber: "P-001",
      quantity: "2.500",
      unitCost: "10.25",
      unitPrice: "12.50",
      exactAmount: "31.250",
      totalCost: "25.625",
      currency: "KRW",
    });
    expect(rows[1].quantity).toBe("0");
    expect(rows[2]).toMatchObject({
      sourcePeriod: "202413",
      billingMonth: null,
      quantity: "-1.25",
      exactAmount: "-40.00",
    });
  });

  it("reports the stable missing-column code", async () => {
    const workbook = await shipmentMissingColumnFixture();
    const operation = collect(
      parseShipmentRows(bufferStream(workbook), loadSourceMapping("shipment")),
    );

    await expect(operation).rejects.toMatchObject({
      code: "MISSING_REQUIRED_COLUMN",
    });
    await expect(operation).rejects.toBeInstanceOf(MissingRequiredColumnError);
  });
});
