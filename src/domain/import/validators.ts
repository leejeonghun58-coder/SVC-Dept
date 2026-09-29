import type { SourceKind } from "./source-mapping";

type CountSample = {
  count: number;
  sourceRowNumber?: number;
  itemNumber?: string;
  [key: string]: unknown;
};

export type ImportSummary = {
  kind: SourceKind;
  duplicateFile: boolean;
  missingRequiredColumns: string[];
  zeroQuantity: CountSample;
  negativeQuantity: CountSample;
  nonKrw: CountSample;
  invalidPeriod: CountSample;
  dvConflict: CountSample;
};

export type ValidationIssue = {
  code:
    | "MISSING_REQUIRED_COLUMN"
    | "DUPLICATE_FILE"
    | "NEGATIVE_QTY_REVIEW"
    | "ZERO_QTY_INFO"
    | "DV_CONFLICT_REVIEW"
    | "NON_KRW_ERROR"
    | "PERIOD_OUT_OF_RANGE";
  severity: "error" | "warning" | "info";
  issueCount: number;
  fieldName: string | null;
  sourceRowNumber: number | null;
  maskedSample: string | null;
};

function maskedItem(sample: CountSample) {
  const item = typeof sample.itemNumber === "string" ? sample.itemNumber : "";
  const prefix = item.match(/^[\p{L}\p{N}]+/u)?.[0] ?? "";
  return prefix ? `${prefix}-***` : null;
}

function issue(
  code: ValidationIssue["code"],
  severity: ValidationIssue["severity"],
  count: number,
  fieldName: string | null,
  sample: CountSample = { count },
): ValidationIssue {
  return {
    code,
    severity,
    issueCount: count,
    fieldName,
    sourceRowNumber: sample.sourceRowNumber ?? null,
    maskedSample: maskedItem(sample),
  };
}

export function validateImport(summary: ImportSummary): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (summary.missingRequiredColumns.length > 0) {
    issues.push(issue("MISSING_REQUIRED_COLUMN", "error", summary.missingRequiredColumns.length, null));
  }
  if (summary.duplicateFile) issues.push(issue("DUPLICATE_FILE", "error", 1, null));
  if (summary.negativeQuantity.count > 0) {
    issues.push(issue("NEGATIVE_QTY_REVIEW", "warning", summary.negativeQuantity.count, "quantity", summary.negativeQuantity));
  }
  if (summary.zeroQuantity.count > 0) {
    issues.push(issue("ZERO_QTY_INFO", "info", summary.zeroQuantity.count, "quantity", summary.zeroQuantity));
  }
  if (summary.nonKrw.count > 0) {
    issues.push(issue("NON_KRW_ERROR", "error", summary.nonKrw.count, "currency", summary.nonKrw));
  }
  if (summary.invalidPeriod.count > 0) {
    issues.push(issue("PERIOD_OUT_OF_RANGE", "error", summary.invalidPeriod.count, "billingMonth", summary.invalidPeriod));
  }
  if (summary.dvConflict.count > 0) {
    issues.push(issue("DV_CONFLICT_REVIEW", "warning", summary.dvConflict.count, "totalDv", summary.dvConflict));
  }
  return issues;
}
