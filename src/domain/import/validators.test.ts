import { describe, expect, it } from "vitest";

import { validateImport, type ImportSummary } from "./validators";

const summary: ImportSummary = {
  kind: "shipment",
  duplicateFile: true,
  missingRequiredColumns: ["itemNumber"],
  zeroQuantity: { count: 2, sourceRowNumber: 8, itemNumber: "P-001" },
  negativeQuantity: { count: 1, sourceRowNumber: 9, itemNumber: "P-002" },
  nonKrw: { count: 1, sourceRowNumber: 10, currency: "USD", customerName: "민감 고객명" },
  invalidPeriod: { count: 1, sourceRowNumber: 11, sourcePeriod: "202413", customerNo: "C-SECRET" },
  dvConflict: { count: 0 },
};

describe("validateImport", () => {
  it("emits stable codes and severities without converting zero or negative quantities", () => {
    const issues = validateImport(summary);

    expect(issues.map(({ code, severity }) => ({ code, severity }))).toEqual([
      { code: "MISSING_REQUIRED_COLUMN", severity: "error" },
      { code: "DUPLICATE_FILE", severity: "error" },
      { code: "NEGATIVE_QTY_REVIEW", severity: "warning" },
      { code: "ZERO_QTY_INFO", severity: "info" },
      { code: "NON_KRW_ERROR", severity: "error" },
      { code: "PERIOD_OUT_OF_RANGE", severity: "error" },
    ]);
  });

  it("masks samples without customer names or customer numbers", () => {
    const serialized = JSON.stringify(validateImport(summary));

    expect(serialized).not.toContain("민감 고객명");
    expect(serialized).not.toContain("C-SECRET");
    expect(serialized).toContain("P-***");
  });

  it("flags DV measure conflicts for review", () => {
    const issues = validateImport({
      ...summary,
      kind: "dv",
      duplicateFile: false,
      missingRequiredColumns: [],
      zeroQuantity: { count: 0 },
      negativeQuantity: { count: 0 },
      nonKrw: { count: 0 },
      invalidPeriod: { count: 0 },
      dvConflict: { count: 3, sourceRowNumber: 12, itemNumber: "M-001" },
    });

    expect(issues).toEqual([
      expect.objectContaining({
        code: "DV_CONFLICT_REVIEW",
        severity: "warning",
        issueCount: 3,
      }),
    ]);
  });
});
