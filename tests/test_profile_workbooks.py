import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from openpyxl import Workbook
from openpyxl.worksheet._read_only import ReadOnlyWorksheet


class ProfileWorkbookTest(unittest.TestCase):
    def test_profile_sheet_uses_stored_dimension_without_forced_rescan(self):
        from tools.profile_cost_workbooks import profile_sheet

        with tempfile.TemporaryDirectory() as temp_dir:
            workbook_path = Path(temp_dir) / "sample.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.title = "Data"
            sheet.append(["Month", "DV"])
            sheet.append(["2024-04", 100])
            workbook.save(workbook_path)

            original = ReadOnlyWorksheet.calculate_dimension
            force_arguments = []

            def recording_calculate_dimension(self, force=False):
                force_arguments.append(force)
                return original(self, force=force)

            with patch.object(
                ReadOnlyWorksheet,
                "calculate_dimension",
                recording_calculate_dimension,
            ):
                result = profile_sheet(workbook_path, "Data", "visible")

        self.assertEqual(result["reported_dimension"], "A1:B2")
        self.assertEqual(force_arguments, [False])


if __name__ == "__main__":
    unittest.main()
