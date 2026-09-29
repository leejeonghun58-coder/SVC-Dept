import { describe, expect, it } from "vitest";

import {
  loadSourceMapping,
  parseBillingMonth,
  resolveHeader,
  validateHeaders,
} from "./source-mapping";

describe("source workbook mapping", () => {
  it("resolves verified shipment and DV header variants", () => {
    const shipment = loadSourceMapping("shipment");
    const dv = loadSourceMapping("dv");

    expect(resolveHeader(shipment, "Customer No")).toBe("customerNo");
    expect(resolveHeader(dv, "CustomerNo")).toBe("customerNo");
    expect(resolveHeader(dv, "CustomerName")).toBe("customerName");
    expect(resolveHeader(dv, "PartNo.")).toBe("itemNumber");
    expect(resolveHeader(dv, "합계 : Total DV")).toBe("totalDv");
  });

  it("rejects a source missing required columns", () => {
    const shipment = loadSourceMapping("shipment");

    expect(() => validateHeaders(shipment, ["Customer No"])).toThrow(
      /필수 열/,
    );
  });

  it("rejects ambiguous duplicate aliases for one canonical field", () => {
    const dv = loadSourceMapping("dv");
    const headers = [
      "Billing Period",
      "Customer No",
      "CustomerNo",
      "Customer Name",
      "Part No.",
      "Total DV",
    ];

    expect(() => validateHeaders(dv, headers)).toThrow(/중복 별칭/);
  });

  it.each([
    ["24-04", "2024-04-01T00:00:00.000Z"],
    ["202404", "2024-04-01T00:00:00.000Z"],
    [202404, "2024-04-01T00:00:00.000Z"],
    ["24년 4월", "2024-04-01T00:00:00.000Z"],
  ])("parses fiscal source month %s", (source, expected) => {
    expect(parseBillingMonth(source).toISOString()).toBe(expected);
  });

  it("rejects invalid month values instead of rolling dates forward", () => {
    expect(() => parseBillingMonth("202413")).toThrow(/월도/);
  });

  it("enforces KRW as the only supported currency", () => {
    const shipment = loadSourceMapping("shipment");
    const dv = loadSourceMapping("dv");

    expect(shipment.currency).toEqual({ mode: "implicit", value: "KRW" });
    expect(dv.currency).toEqual({
      mode: "column",
      value: "KRW",
      header: "currency",
    });
    expect(dv.allowedCurrencies).toEqual(["KRW"]);
  });

  it("leaves unsupported business interpretations pending approval", () => {
    const shipment = loadSourceMapping("shipment");
    const dv = loadSourceMapping("dv");

    expect(shipment.fields.category.approvalRequired).toBe(true);
    expect(shipment.fields.exactAmount.approvalRequired).toBe(true);
    expect(shipment.fields.svcTeam.approvalRequired).toBe(true);
    expect(dv.fields.svcTeam.approvalRequired).toBe(true);
    expect(dv.fields.channel.approvalRequired).toBe(true);
  });
});
