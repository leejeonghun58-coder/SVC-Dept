from __future__ import annotations

from datetime import datetime
import hashlib
import math
from pathlib import Path
from typing import Any, Iterator
from xml.etree import ElementTree as ET
import zipfile


NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
DEFINITION_PATH = "xl/pivotCache/pivotCacheDefinition1.xml"
RECORDS_PATH = "xl/pivotCache/pivotCacheRecords1.xml"


def _decode_literal(element: ET.Element) -> Any:
    tag = element.tag.rsplit("}", 1)[-1]
    value = element.get("v")
    if tag == "m":
        return None
    if tag == "n":
        return float(value) if value is not None else None
    if tag == "b":
        return value == "1"
    if tag == "d":
        return datetime.fromisoformat(value) if value else None
    return value


def read_cache_definition(workbook_path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(workbook_path) as archive:
        root = ET.fromstring(archive.read(DEFINITION_PATH))

    source = root.find(f"{NS}cacheSource/{NS}worksheetSource")
    fields = root.findall(f"{NS}cacheFields/{NS}cacheField")
    field_names: list[str] = []
    shared_items: list[list[Any]] = []
    for field in fields:
        field_names.append(field.get("name", ""))
        items_node = field.find(f"{NS}sharedItems")
        shared_items.append([] if items_node is None else [_decode_literal(item) for item in list(items_node)])

    return {
        "record_count": int(root.get("recordCount", "0")),
        "source_sheet": source.get("sheet") if source is not None else None,
        "source_ref": source.get("ref") if source is not None else None,
        "field_names": field_names,
        "shared_items": shared_items,
    }


def iter_cache_rows(workbook_path: Path, metadata: dict[str, Any]) -> Iterator[list[Any]]:
    shared_items = metadata["shared_items"]
    with zipfile.ZipFile(workbook_path) as archive:
        with archive.open(RECORDS_PATH) as stream:
            for _, element in ET.iterparse(stream, events=("end",)):
                if element.tag != f"{NS}r":
                    continue
                row: list[Any] = []
                for index, item in enumerate(list(element)):
                    tag = item.tag.rsplit("}", 1)[-1]
                    if tag == "x":
                        shared_index = int(item.get("v", "0"))
                        row.append(shared_items[index][shared_index])
                    else:
                        row.append(_decode_literal(item))
                yield row
                element.clear()


def _normalized(value: Any) -> str:
    if value is None:
        return "<NULL>"
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, float) and math.isnan(value):
        return "<NAN>"
    return str(value).strip()


def profile_cache(workbook_path: Path, unique_cap: int = 10_000) -> dict[str, Any]:
    metadata = read_cache_definition(workbook_path)
    columns = [
        {
            "name": name,
            "blank": 0,
            "types": {},
            "unique": set(),
            "unique_capped": False,
            "zero_count": 0,
            "negative_count": 0,
            "minimum": None,
            "maximum": None,
        }
        for name in metadata["field_names"]
    ]
    row_hashes: set[bytes] = set()
    duplicates = 0
    row_count = 0

    for row in iter_cache_rows(workbook_path, metadata):
        row_count += 1
        row_key = "\x1f".join(_normalized(value) for value in row).encode("utf-8", errors="replace")
        row_hash = hashlib.blake2b(row_key, digest_size=16).digest()
        if row_hash in row_hashes:
            duplicates += 1
        else:
            row_hashes.add(row_hash)

        for index, stat in enumerate(columns):
            value = row[index] if index < len(row) else None
            if value is None or (isinstance(value, str) and not value.strip()):
                stat["blank"] += 1
                continue
            kind = "datetime" if isinstance(value, datetime) else type(value).__name__
            stat["types"][kind] = stat["types"].get(kind, 0) + 1
            if not stat["unique_capped"]:
                stat["unique"].add(_normalized(value))
                if len(stat["unique"]) > unique_cap:
                    stat["unique"].clear()
                    stat["unique_capped"] = True
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                if value == 0:
                    stat["zero_count"] += 1
                if value < 0:
                    stat["negative_count"] += 1
                stat["minimum"] = value if stat["minimum"] is None else min(stat["minimum"], value)
                stat["maximum"] = value if stat["maximum"] is None else max(stat["maximum"], value)
            elif isinstance(value, datetime):
                stat["minimum"] = value if stat["minimum"] is None else min(stat["minimum"], value)
                stat["maximum"] = value if stat["maximum"] is None else max(stat["maximum"], value)

    public_columns = []
    for stat in columns:
        public_columns.append(
            {
                "name": stat["name"],
                "blank": stat["blank"],
                "blank_rate": round(stat["blank"] / row_count, 6) if row_count else None,
                "types": stat["types"],
                "unique_count": f">{unique_cap}" if stat["unique_capped"] else len(stat["unique"]),
                "zero_count": stat["zero_count"],
                "negative_count": stat["negative_count"],
                "minimum": stat["minimum"].isoformat() if isinstance(stat["minimum"], datetime) else stat["minimum"],
                "maximum": stat["maximum"].isoformat() if isinstance(stat["maximum"], datetime) else stat["maximum"],
            }
        )

    return {
        "record_count_declared": metadata["record_count"],
        "source_sheet": metadata["source_sheet"],
        "source_ref": metadata["source_ref"],
        "field_names": metadata["field_names"],
        "rows": row_count,
        "exact_duplicate_rows": duplicates,
        "exact_duplicate_rate": round(duplicates / row_count, 6) if row_count else None,
        "columns": public_columns,
    }
