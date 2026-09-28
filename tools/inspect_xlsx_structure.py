from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path


def inspect(path: Path) -> dict[str, object]:
    with zipfile.ZipFile(path) as archive:
        sheet_paths = [
            name
            for name in archive.namelist()
            if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", name)
        ]
        sheets = []
        for sheet_path in sheet_paths:
            xml = archive.read(sheet_path)
            sheets.append(
                {
                    "xml": sheet_path,
                    "merged_cells": xml.count(b"<mergeCell "),
                    "hidden_rows": len(re.findall(br'<row[^>]* hidden="1"', xml)),
                    "hidden_columns": len(re.findall(br'<col[^>]* hidden="1"', xml)),
                }
            )
    return {"file": path.name, "sheets": sheets}


print(json.dumps([inspect(Path(arg)) for arg in sys.argv[1:]], ensure_ascii=False))
