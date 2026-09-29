import { z } from "zod";

import sourceMappings from "../../../config/source-mappings.json";

const fieldMappingSchema = z.object({
  aliases: z.array(z.string().min(1)).min(1),
  required: z.boolean(),
  approvalRequired: z.boolean(),
});

const currencySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("implicit"), value: z.literal("KRW") }),
  z.object({
    mode: z.literal("column"),
    value: z.literal("KRW"),
    header: z.string().min(1),
  }),
]);

export const SourceMappingSchema = z
  .object({
    kind: z.enum(["shipment", "dv"]),
    currency: currencySchema,
    allowedCurrencies: z.array(z.literal("KRW")).length(1),
    fields: z.record(z.string(), fieldMappingSchema),
  })
  .superRefine((mapping, context) => {
    const owners = new Map<string, string>();
    for (const [field, definition] of Object.entries(mapping.fields)) {
      for (const alias of definition.aliases) {
        const normalized = normalizeHeader(alias);
        const owner = owners.get(normalized);
        if (owner && owner !== field) {
          context.addIssue({
            code: "custom",
            message: `헤더 별칭 '${alias}'이(가) ${owner}, ${field}에 중복 정의되었습니다.`,
            path: ["fields", field, "aliases"],
          });
        }
        owners.set(normalized, field);
      }
    }
  });

export type SourceMapping = z.infer<typeof SourceMappingSchema>;
export type SourceKind = SourceMapping["kind"];

function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function loadSourceMapping(kind: SourceKind): SourceMapping {
  const mapping = sourceMappings[kind];
  return SourceMappingSchema.parse(mapping);
}

export function resolveHeader(
  mapping: SourceMapping,
  sourceHeader: string,
): string | undefined {
  const normalized = normalizeHeader(sourceHeader);
  for (const [field, definition] of Object.entries(mapping.fields)) {
    if (
      definition.aliases.some(
        (candidate) => normalizeHeader(candidate) === normalized,
      )
    ) {
      return field;
    }
  }
  return undefined;
}

export function validateHeaders(
  mapping: SourceMapping,
  sourceHeaders: string[],
): ReadonlyMap<string, string> {
  const resolved = new Map<string, string>();

  for (const header of sourceHeaders) {
    const field = resolveHeader(mapping, header);
    if (!field) continue;
    const existing = resolved.get(field);
    if (existing) {
      throw new Error(
        `표준 필드 '${field}'에 중복 별칭 '${existing}', '${header}'이(가) 있습니다.`,
      );
    }
    resolved.set(field, header);
  }

  const missing = Object.entries(mapping.fields)
    .filter(([, definition]) => definition.required)
    .map(([field]) => field)
    .filter((field) => !resolved.has(field));

  if (missing.length > 0) {
    throw new Error(`필수 열이 없습니다: ${missing.join(", ")}`);
  }

  return resolved;
}

export function parseBillingMonth(value: string | number): Date {
  const source = String(value).trim();
  const compact = source.match(/^(\d{4})(\d{2})$/);
  const short = source.match(/^(\d{2})-(\d{2})$/);
  const korean = source.match(/^(\d{2})년\s*(\d{1,2})월$/);

  let year: number;
  let month: number;
  if (compact) {
    year = Number(compact[1]);
    month = Number(compact[2]);
  } else if (short) {
    year = 2000 + Number(short[1]);
    month = Number(short[2]);
  } else if (korean) {
    year = 2000 + Number(korean[1]);
    month = Number(korean[2]);
  } else {
    throw new Error(`지원하지 않는 월도 형식입니다: ${source}`);
  }

  if (year < 2000 || year > 2099 || month < 1 || month > 12) {
    throw new Error(`유효하지 않은 월도입니다: ${source}`);
  }

  return new Date(Date.UTC(year, month - 1, 1));
}
