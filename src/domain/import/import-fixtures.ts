import ExcelJS from "exceljs";
import JSZip from "jszip";
import { Readable } from "node:stream";

export function bufferStream(buffer: Buffer) {
  return Readable.from(buffer);
}

async function worksheetFixture(
  sheetName: string,
  titleRows: unknown[][],
  headers: string[],
  rows: unknown[][],
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  for (const row of titleRows) sheet.addRow(row);
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  const generated = Buffer.from(await workbook.xlsx.writeBuffer());
  const source = await JSZip.loadAsync(generated);
  const reordered = new JSZip();
  const names = Object.keys(source.files).filter((name) => !source.files[name].dir);
  const priority = (name: string) => {
    if (name === "xl/workbook.xml") return 0;
    if (name === "xl/_rels/workbook.xml.rels") return 1;
    if (name.startsWith("xl/worksheets/")) return 2;
    if (name === "xl/styles.xml") return 3;
    if (name === "xl/sharedStrings.xml") return 4;
    return 5;
  };
  names.sort((left, right) => priority(left) - priority(right));
  for (const name of names) {
    reordered.file(name, await source.files[name].async("uint8array"));
  }
  return Buffer.from(await reordered.generateAsync({ type: "uint8array" }));
}

export function shipmentWorksheetFixture() {
  return worksheetFixture(
    "List",
    [],
    [
      "월도",
      "Customer No",
      "Customer Name",
      "Charge Detail Item Number",
      "Charge Detail Item Description",
      "Qty",
      "Item/Material Cost",
      "Overide Unit Price",
      "Extended Price",
      "Total Cost",
    ],
    [
      ["24년 4월", "C001", "고객 에이", "P-001", "Filter", "2.500", "10.25", "12.50", "31.250", "25.625"],
      [null, null, null, null, null, null, null, null, null, null],
      ["202405", "C002", "고객 비", "P-002", "Drum", "0", "20", "22", "0", "0"],
      ["202413", "C003", "고객 시", "P-003", "Return", "-1.25", "30", "32", "-40.00", "-37.50"],
    ],
  );
}

export function shipmentMissingColumnFixture() {
  return worksheetFixture(
    "List",
    [],
    ["월도", "Customer No", "Customer Name", "Qty"],
    [["202404", "C001", "고객 에이", 1]],
  );
}

export function dvWorksheetFixture() {
  return worksheetFixture(
    "DVList",
    [["DV export"]],
    [
      "Billing Period",
      "CustomerNo",
      "CustomerName",
      "PartNo.",
      "SerialNo",
      "Total DV",
      "TOTAL REV",
      "Currency",
    ],
    [
      [202504, "C001", "고객 에이", "M-001", "S-001", "100.00", "1234.50", "KRW"],
      [202504, "C001", "고객 에이", "M-001", "S-001", "100.00", "1234.50", "KRW"],
      [202504, "C001", "고객 에이", "M-001", "S-001", "120.00", "1234.50", "USD"],
    ],
  );
}

export async function dvPivotCacheFixture() {
  const zip = new JSZip();
  zip.file(
    "xl/pivotCache/pivotCacheDefinition1.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<pivotCacheDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" recordCount="3">
  <cacheSource type="worksheet"><worksheetSource ref="A1:H4" sheet="Sheet2"/></cacheSource>
  <cacheFields count="8">
    <cacheField name="Billing Period"><sharedItems><n v="202404"/></sharedItems></cacheField>
    <cacheField name="CustomerNo"><sharedItems><s v="C001"/></sharedItems></cacheField>
    <cacheField name="CustomerName"><sharedItems><s v="고객 에이"/></sharedItems></cacheField>
    <cacheField name="PartNo."><sharedItems><s v="M-001"/></sharedItems></cacheField>
    <cacheField name="SerialNo"><sharedItems><s v="S-001"/></sharedItems></cacheField>
    <cacheField name="합계 : Total DV"><sharedItems/></cacheField>
    <cacheField name="합계 : TOTAL REV"><sharedItems/></cacheField>
    <cacheField name="Currency"><sharedItems><s v="KRW"/></sharedItems></cacheField>
  </cacheFields>
</pivotCacheDefinition>`,
  );
  zip.file(
    "xl/pivotCache/pivotCacheRecords1.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<pivotCacheRecords xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3">
  <r><x v="0"/><x v="0"/><x v="0"/><x v="0"/><x v="0"/><n v="10.00"/><n v="20.50"/><x v="0"/></r>
  <r><x v="0"/><x v="0"/><x v="0"/><x v="0"/><x v="0"/><n v="10.00"/><n v="20.50"/><x v="0"/></r>
  <r><x v="0"/><x v="0"/><x v="0"/><x v="0"/><x v="0"/><n v="12.00"/><n v="20.50"/><x v="0"/></r>
</pivotCacheRecords>`,
  );
  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}
