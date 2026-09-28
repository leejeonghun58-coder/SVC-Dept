import unittest
import tempfile
from pathlib import Path

from openpyxl import Workbook


class AnalyzeDvDuplicatesTest(unittest.TestCase):
    def test_reads_header_variants_as_canonical_workbook_fields(self):
        from tools.analyze_dv_duplicates import iter_workbook_rows

        with tempfile.TemporaryDirectory() as temp_dir:
            workbook_path = Path(temp_dir) / "dv.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.title = "DVList"
            sheet.append(["title"])
            sheet.append(
                ["Billing Period", "CustomerNo", "Serial No", "&", "Total DV"]
            )
            sheet.append([202504, "C1", "00123", "M1-00123", 100])
            workbook.save(workbook_path)

            rows = list(iter_workbook_rows(workbook_path, "DVList", header_row=2))

        self.assertEqual(
            rows,
            [{
                "period": 202504,
                "customer": "C1",
                "serial": "00123",
                "equipment_key": "M1-00123",
                "total_dv": 100,
            }],
        )

    def test_profiles_exact_and_conflicting_equipment_month_duplicates(self):
        from tools.analyze_dv_duplicates import profile_rows

        rows = [
            {"period": 202504, "equipment_key": "M1-S1", "total_dv": 10},
            {"period": 202504, "equipment_key": "M1-S1", "total_dv": 10},
            {"period": 202504, "equipment_key": "M1-S1", "total_dv": 12},
            {"period": 202505, "equipment_key": "M1-S1", "total_dv": 11},
        ]

        result = profile_rows(
            rows,
            key_fields=("period", "equipment_key"),
            measure_fields=("total_dv",),
        )

        self.assertEqual(result["row_count"], 4)
        self.assertEqual(result["exact_duplicate_excess_rows"], 1)
        self.assertEqual(result["exact_duplicate_affected_rows"], 2)
        self.assertEqual(result["exact_duplicate_groups"], 1)
        self.assertEqual(result["exact_duplicate_excess_by_period"], {"202504": 1})
        self.assertEqual(result["max_exact_copies"], 2)
        self.assertEqual(result["key_duplicate_excess_rows"], 2)
        self.assertEqual(result["key_duplicate_affected_rows"], 3)
        self.assertEqual(result["key_duplicate_groups"], 1)
        self.assertEqual(result["conflicting_key_groups"], 1)
        self.assertEqual(result["same_measure_key_groups"], 0)
        self.assertEqual(result["conflicting_measure_key_groups"], 1)
        self.assertEqual(result["key_duplicate_excess_by_period"], {"202504": 2})
        self.assertEqual(result["max_key_copies"], 3)

    def test_distinguishes_same_measure_duplicates_from_measure_conflicts(self):
        from tools.analyze_dv_duplicates import profile_rows

        rows = [
            {"period": 202504, "equipment_key": "E1", "contract": "A", "total_dv": 10},
            {"period": 202504, "equipment_key": "E1", "contract": "B", "total_dv": 10},
            {"period": 202504, "equipment_key": "E2", "contract": "A", "total_dv": 20},
            {"period": 202504, "equipment_key": "E2", "contract": "B", "total_dv": 21},
        ]

        result = profile_rows(
            rows,
            key_fields=("period", "equipment_key"),
            measure_fields=("total_dv",),
        )

        self.assertEqual(result["key_duplicate_groups"], 2)
        self.assertEqual(result["same_measure_key_groups"], 1)
        self.assertEqual(result["conflicting_measure_key_groups"], 1)

    def test_compares_period_rows_as_multisets_on_selected_fields(self):
        from tools.analyze_dv_duplicates import compare_period_rows

        left = [
            {"period": 202403, "customer": "C1", "equipment": "E1", "total_dv": 10},
            {"period": 202403, "customer": "C2", "equipment": "E2", "total_dv": 20},
            {"period": 202402, "customer": "C9", "equipment": "E9", "total_dv": 90},
        ]
        right = [
            {"period": 202403, "customer": "C2", "equipment": "E2", "total_dv": 20},
            {"period": 202403, "customer": "C1", "equipment": "E1", "total_dv": 11},
        ]

        result = compare_period_rows(
            left,
            right,
            period=202403,
            fields=("customer", "equipment", "total_dv"),
        )

        self.assertEqual(result["left_rows"], 2)
        self.assertEqual(result["right_rows"], 2)
        self.assertEqual(result["matched_rows"], 1)
        self.assertEqual(result["left_only_rows"], 1)
        self.assertEqual(result["right_only_rows"], 1)


if __name__ == "__main__":
    unittest.main()
