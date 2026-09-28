from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

from openpyxl.utils.datetime import from_excel

from tools.pivot_cache import iter_cache_rows, read_cache_definition


path = Path(sys.argv[1])
metadata = read_cache_definition(path)
index = {name: position for position, name in enumerate(metadata["field_names"])}

months: Counter[str] = Counter()
sr_min = None
sr_max = None
service_date_sentinel = 0

for row in iter_cache_rows(path, metadata):
    month = row[index["월도"]]
    if month is not None:
        months[str(month).strip()] += 1
    sr_date = row[index["SR Date"]]
    if isinstance(sr_date, (int, float)):
        sr_min = sr_date if sr_min is None else min(sr_min, sr_date)
        sr_max = sr_date if sr_max is None else max(sr_max, sr_date)
    service_date = row[index["Service Date"]]
    if isinstance(service_date, (int, float)) and service_date > 100000:
        service_date_sentinel += 1

print(
    json.dumps(
        {
            "months": dict(sorted(months.items())),
            "sr_date_min": from_excel(sr_min).isoformat() if sr_min is not None else None,
            "sr_date_max": from_excel(sr_max).isoformat() if sr_max is not None else None,
            "service_date_values_over_100000": service_date_sentinel,
        },
        ensure_ascii=True,
    )
)
