import tempfile
import unittest
import zipfile
from pathlib import Path


class PivotCacheReaderTest(unittest.TestCase):
    def test_reads_field_names_source_and_decoded_rows(self):
        from tools.pivot_cache import iter_cache_rows, read_cache_definition

        definition = """<?xml version="1.0" encoding="UTF-8"?>
        <pivotCacheDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" recordCount="2">
          <cacheSource type="worksheet"><worksheetSource ref="A1:C3" sheet="List"/></cacheSource>
          <cacheFields count="3">
            <cacheField name="Month"><sharedItems count="2"><s v="24-04"/><s v="24-05"/></sharedItems></cacheField>
            <cacheField name="Qty"><sharedItems/></cacheField>
            <cacheField name="Status"><sharedItems count="2"><s v="OK"/><s v="RETURN"/></sharedItems></cacheField>
          </cacheFields>
        </pivotCacheDefinition>"""
        records = """<?xml version="1.0" encoding="UTF-8"?>
        <pivotCacheRecords xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2">
          <r><x v="0"/><n v="2"/><x v="0"/></r>
          <r><x v="1"/><n v="-1"/><x v="1"/></r>
        </pivotCacheRecords>"""

        with tempfile.TemporaryDirectory() as temp_dir:
            workbook = Path(temp_dir) / "sample.xlsx"
            with zipfile.ZipFile(workbook, "w") as archive:
                archive.writestr("xl/pivotCache/pivotCacheDefinition1.xml", definition)
                archive.writestr("xl/pivotCache/pivotCacheRecords1.xml", records)

            metadata = read_cache_definition(workbook)
            rows = list(iter_cache_rows(workbook, metadata))

        self.assertEqual(metadata["record_count"], 2)
        self.assertEqual(metadata["source_sheet"], "List")
        self.assertEqual(metadata["source_ref"], "A1:C3")
        self.assertEqual(metadata["field_names"], ["Month", "Qty", "Status"])
        self.assertEqual(rows, [["24-04", 2.0, "OK"], ["24-05", -1.0, "RETURN"]])

    def test_profiles_cache_rows_without_exposing_values(self):
        from tools.pivot_cache import profile_cache

        definition = """<?xml version="1.0" encoding="UTF-8"?>
        <pivotCacheDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" recordCount="3">
          <cacheSource type="worksheet"><worksheetSource ref="A1:B4" sheet="List"/></cacheSource>
          <cacheFields count="2">
            <cacheField name="Month"><sharedItems count="2"><s v="24-04"/><s v="24-05"/></sharedItems></cacheField>
            <cacheField name="Qty"><sharedItems/></cacheField>
          </cacheFields>
        </pivotCacheDefinition>"""
        records = """<?xml version="1.0" encoding="UTF-8"?>
        <pivotCacheRecords xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3">
          <r><x v="0"/><n v="2"/></r>
          <r><x v="1"/><n v="-1"/></r>
          <r><x v="1"/><n v="-1"/></r>
        </pivotCacheRecords>"""

        with tempfile.TemporaryDirectory() as temp_dir:
            workbook = Path(temp_dir) / "sample.xlsx"
            with zipfile.ZipFile(workbook, "w") as archive:
                archive.writestr("xl/pivotCache/pivotCacheDefinition1.xml", definition)
                archive.writestr("xl/pivotCache/pivotCacheRecords1.xml", records)
            profile = profile_cache(workbook)

        self.assertEqual(profile["rows"], 3)
        self.assertEqual(profile["exact_duplicate_rows"], 1)
        self.assertEqual(profile["columns"][1]["negative_count"], 2)
        self.assertEqual(profile["columns"][0]["unique_count"], 2)
        self.assertNotIn("values", profile["columns"][0])


if __name__ == "__main__":
    unittest.main()
