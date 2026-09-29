import type { Readable } from "node:stream";

import type { SourceMapping } from "./source-mapping";
import {
  canonicalBillingMonth,
  decimalValue,
  requiredText,
  streamWorksheetRows,
  textValue,
  type ShipmentInput,
} from "./common";

export { MissingRequiredColumnError } from "./common";

export async function* parseShipmentRows(
  stream: Readable,
  mapping: SourceMapping,
): AsyncGenerator<ShipmentInput> {
  if (mapping.kind !== "shipment") {
    throw new Error("출고 매핑이 필요합니다.");
  }

  for await (const row of streamWorksheetRows(stream, mapping)) {
    const sourcePeriod = requiredText(row.values, "billingMonth");
    yield {
      sourceRowNumber: row.sourceRowNumber,
      sourcePeriod,
      billingMonth: canonicalBillingMonth(sourcePeriod),
      customerNo: requiredText(row.values, "customerNo"),
      customerName: requiredText(row.values, "customerName"),
      itemNumber: requiredText(row.values, "itemNumber"),
      itemDescription: textValue(row.values, "itemDescription"),
      quantity: decimalValue(row.values, "quantity", true) ?? "",
      unitCost: decimalValue(row.values, "unitCost"),
      unitPrice: decimalValue(row.values, "unitPrice"),
      exactAmount: decimalValue(row.values, "exactAmount"),
      totalCost: decimalValue(row.values, "totalCost"),
      category: textValue(row.values, "category"),
      subCategory: textValue(row.values, "subCategory"),
      svcTeam: textValue(row.values, "svcTeam"),
      model: textValue(row.values, "model"),
      channel: textValue(row.values, "channel"),
      currency: "KRW",
    };
  }
}
