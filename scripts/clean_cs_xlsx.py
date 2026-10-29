"""Clean CS timetable xlsx (ภาคปกติ / ภาคพิเศษ) into tidy CSV files.

Each source workbook has 12 sheets. In every sheet except the dashboard
("ดูตาราง") rows 0..4 are titles/notes and the real header lives at
row index 5. The cleaner:

  - uses row 5 as the header for every data sheet
  - drops fully-empty rows and trailing empty columns
  - drops footnote rows (only one non-empty cell containing a long sentence)
  - normalises datetime.time → HH:MM strings
  - dumps the dashboard sheet as a raw grid (trimmed), since it is a form
    rather than a table
  - writes one CSV per sheet under data/processed/CS/<section>/

Sheet-name → file-name uses an English slug map so downstream code
does not depend on Thai filenames.
"""

from __future__ import annotations

import csv
import datetime as _dt
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "processed" / "CS"

SOURCES: dict[str, str] = {
    "normal": "CS_ภาคปกติ_รวมทุกชั้นปี.xlsx",
    "special": "CS_ภาคพิเศษ_รวมทุกชั้นปี.xlsx",
}

SHEET_SLUGS: dict[str, str] = {
    "ดูตาราง": "overview",
    "ตารางรายสัปดาห์": "weekly_schedule",
    "กรณีตารางเรียน": "schedule_cases",
    "วิชาแรกของวัน": "first_class_of_day",
    "แผนตามเทอม": "plan_by_term",
    "รายวิชา": "courses",
    "เซคเรียน": "sections",
    "คาบเรียน": "periods",
    "วิชาโท": "minor_subjects",
    "วิชาเสรีและสหกิจ": "electives_and_coop",
    "เงื่อนไขและรอเติม": "conditions",
    "ชุดข้อมูล": "datasets",
}

HEADER_ROW = 5           # for every sheet except OVERVIEW_SHEET
OVERVIEW_SHEET = "ดูตาราง"
FOOTNOTE_MIN_LEN = 30    # single-cell rows longer than this = footnote


def _is_empty(value) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == "")


def _normalise(value):
    if isinstance(value, _dt.time):
        return value.strftime("%H:%M")
    if isinstance(value, _dt.datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return value.strip()
    return value


def _non_empty_cells(row) -> list:
    return [c for c in row if not _is_empty(c)]


def _is_footnote(row) -> bool:
    cells = _non_empty_cells(row)
    if len(cells) != 1:
        return False
    only = cells[0]
    return isinstance(only, str) and len(only) >= FOOTNOTE_MIN_LEN


def _trim_columns(header: tuple, data_rows: list[tuple]) -> tuple[list, list[list]]:
    width = max(len(header), *(len(r) for r in data_rows), 0)
    keep = [False] * width
    for i in range(min(width, len(header))):
        if not _is_empty(header[i]):
            keep[i] = True
    for row in data_rows:
        for i in range(min(width, len(row))):
            if not _is_empty(row[i]):
                keep[i] = True
    last = max((i for i, k in enumerate(keep) if k), default=-1)
    if last < 0:
        return [], []
    cols = list(range(last + 1))
    new_header = [header[i] if i < len(header) else "" for i in cols]
    new_rows = [[row[i] if i < len(row) else None for i in cols] for row in data_rows]
    for i, h in enumerate(new_header):
        if _is_empty(h):
            new_header[i] = f"col_{i + 1}"
    return new_header, new_rows


def clean_table(rows: list[tuple]) -> tuple[list, list[list]] | None:
    if len(rows) <= HEADER_ROW:
        return None
    header = rows[HEADER_ROW]
    body = rows[HEADER_ROW + 1 :]
    body = [r for r in body if _non_empty_cells(r) and not _is_footnote(r)]
    header, body = _trim_columns(header, body)
    if not header:
        return None
    header = [_normalise(h) for h in header]
    body = [[_normalise(c) for c in r] for r in body]
    return header, body


def clean_overview(rows: list[tuple]) -> tuple[list, list[list]] | None:
    """Dashboard sheet: dump the raw grid, trimmed to the populated bbox."""
    non_empty = [i for i, r in enumerate(rows) if _non_empty_cells(r)]
    if not non_empty:
        return None
    first, last = non_empty[0], non_empty[-1]
    body = list(rows[first : last + 1])
    width = max(len(r) for r in body)
    keep_col = [False] * width
    for row in body:
        for i in range(min(width, len(row))):
            if not _is_empty(row[i]):
                keep_col[i] = True
    last_col = max((i for i, k in enumerate(keep_col) if k), default=-1)
    if last_col < 0:
        return None
    cols = list(range(last_col + 1))
    header = [f"col_{i + 1}" for i in cols]
    trimmed = [[row[i] if i < len(row) else None for i in cols] for row in body]
    trimmed = [[_normalise(c) for c in r] for r in trimmed]
    return header, trimmed


def convert_workbook(xlsx_path: Path, out_dir: Path) -> list[tuple[str, int]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    summary: list[tuple[str, int]] = []
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        cleaned = (
            clean_overview(rows) if sheet_name == OVERVIEW_SHEET else clean_table(rows)
        )
        if cleaned is None:
            summary.append((sheet_name, 0))
            continue
        header, body = cleaned
        slug = SHEET_SLUGS.get(sheet_name, sheet_name.replace(" ", "_"))
        out_path = out_dir / f"{slug}.csv"
        with out_path.open("w", encoding="utf-8-sig", newline="") as fh:
            writer = csv.writer(fh)
            writer.writerow(header)
            writer.writerows(body)
        summary.append((sheet_name, len(body)))
    return summary


def main() -> None:
    for section, filename in SOURCES.items():
        src = RAW_DIR / filename
        if not src.exists():
            print(f"[skip] missing: {src}")
            continue
        dst = OUT_DIR / section
        print(f"\n== {section} :: {filename} ==")
        summary = convert_workbook(src, dst)
        for sheet, n in summary:
            slug = SHEET_SLUGS.get(sheet, sheet)
            print(f"  {slug:<22} ({sheet:<24}) → {n} rows")
    print(f"\nOutput directory: {OUT_DIR}")


if __name__ == "__main__":
    main()
