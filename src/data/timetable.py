"""
src/data/timetable.py
======================
อ่านตารางเรียน CS จาก Excel แล้วแปลงเป็นรายการ PassengerDemand
สำหรับส่งเข้า run_simulation() แทนการสุ่ม

แหล่งข้อมูล : data/raw/cs_timetable.xlsx  (sheet "ตารางรายสัปดาห์")
สมมติฐาน   : ผู้โดยสารทุกคนอยู่หอพักโซน Dorm
              เดินทางไปถึงป้ายก่อนเริ่มเรียน ARRIVE_BEFORE_CLASS_MIN นาที
              เดินจากป้ายถึงอาคาร WALK_TIME_MIN นาที
              จำนวนผู้โดยสารต่อกลุ่ม = 1 คน (ปรับเป็นตัวเลขจริงได้)
"""
from __future__ import annotations
import math
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd

# ─── Configurable constants ───────────────────────────────────────────────────
ARRIVE_BEFORE_CLASS_MIN: float = 15.0   # ผู้โดยสารอยากถึงก่อนเรียนกี่นาที
WALK_TIME_MIN: dict[str, float] = {     # เวลาเดินจากป้ายถึงอาคาร (นาที)
    "Lecture": 3.0,   # LC1-LC5 อยู่ใกล้ป้าย Lecture
    "SC2_SC3": 4.0,   # SC1-SC4 อยู่ใกล้ป้าย SC2_SC3
    "SC1": 5.0,
    "Social": 3.0,
    "Health": 5.0,
    "Hospital": 4.0,
    "Convention": 3.0,
}
DEFAULT_WALK_MIN: float = 5.0

# ─── Building → Bus Stop mapping ─────────────────────────────────────────────
BUILDING_TO_STOP: dict[str, str] = {
    # อาคารบรรยายรวม LC
    "LC": "Lecture",   "LC1": "Lecture", "LC2": "Lecture",
    "LC3": "Lecture",  "LC4": "Lecture", "LC5": "Lecture",
    # กลุ่มวิทยาศาสตร์ SC
    "SC": "SC2_SC3",   "SC1": "SC1",     "SC2": "SC2_SC3",
    "SC3": "SC2_SC3",  "SC4": "SC2_SC3", "SC5": "SC2_SC3",
    # สังคมศาสตร์ / มนุษยศาสตร์
    "SOC": "Social",   "HUM": "Social",
    # สุขภาพ
    "HEA": "Health",   "MED": "Health",   "NUR": "Health",
    "HOSP": "Hospital",
    # อื่น ๆ
    "LIB": "Library",  "CONV": "Convention",
}
# Origin ของ CS: หอพัก → ป้าย Dorm
DEFAULT_ORIGIN_STOP = "Dorm"

# ─── Day name mapping (Thai → index) ─────────────────────────────────────────
DAY_MAP = {
    "จันทร์": 0, "อังคาร": 1, "พุธ": 2,
    "พฤหัสบดี": 3, "ศุกร์": 4, "เสาร์": 5, "อาทิตย์": 6,
}


@dataclass
class PassengerDemand:
    """ความต้องการเดินทางของผู้โดยสารหนึ่งคนหรือหนึ่งกลุ่ม"""
    passenger_id: int
    origin: str
    destination: str
    arrival_at_stop: float      # นาทีจากเที่ยงคืน ที่ผู้โดยสารมาถึงป้ายรอรถ
    class_start_time: float     # นาทีจากเที่ยงคืน ที่คาบเรียนเริ่ม
    walk_time_minutes: float    # เวลาเดินจากป้ายถึงอาคาร (นาที)
    target_arrival: float       # เวลาที่ผู้โดยสารอยากถึงก่อนเรียน (= class_start - buffer)
    course_code: str = ""       # รหัสวิชา (เพื่อ tracing)
    building: str = ""          # ตึกปลายทาง
    day_of_week: int = 0        # 0=จันทร์ … 6=อาทิตย์
    section: str = ""           # เซคเรียน
    group_size: int = 1         # จำนวนคนในกลุ่มนี้ (ขณะนี้ = 1 ต่อแถว)


def _time_str_to_minutes(t) -> Optional[float]:
    """แปลง '08:00:00' หรือ '08:00' → 480.0 (นาที)"""
    if pd.isna(t):
        return None
    s = str(t).strip()
    parts = s.split(":")
    try:
        h, m = int(parts[0]), int(parts[1])
        return float(h * 60 + m)
    except Exception:
        return None


def _resolve_destination_stop(building_code: str) -> str:
    """แปลงรหัสตึก (เช่น 'LC3') เป็นชื่อป้ายรถบัส"""
    if not isinstance(building_code, str) or not building_code.strip():
        return "SC2_SC3"
    code = building_code.strip().upper()
    # ตรวจตรงก่อน
    if code in BUILDING_TO_STOP:
        return BUILDING_TO_STOP[code]
    # ตรวจ prefix
    for prefix, stop in BUILDING_TO_STOP.items():
        if code.startswith(prefix.upper()):
            return stop
    return "SC2_SC3"  # fallback สำหรับ CS


def _get_walk_time(dest_stop: str) -> float:
    return WALK_TIME_MIN.get(dest_stop, DEFAULT_WALK_MIN)


def load_cs_timetable(
    xlsx_path: str | Path = "data/raw/cs_timetable.xlsx",
    day_filter: Optional[list[str]] = None,
    students_per_section: int = 40,
    arrive_before_min: float = ARRIVE_BEFORE_CLASS_MIN,
    origin_stop: str = DEFAULT_ORIGIN_STOP,
) -> list[PassengerDemand]:
    """
    อ่านตาราง CS จาก Excel แล้วคืน list[PassengerDemand]

    Parameters
    ----------
    xlsx_path          : path ไปยัง cs_timetable.xlsx
    day_filter         : จำกัดวันที่สนใจ เช่น ['อังคาร', 'พฤหัสบดี']
                         None = ใช้ทุกวัน
    students_per_section : จำนวนนักศึกษาสมมติต่อเซค (ใช้เมื่อไม่มีข้อมูลจำนวนจริง)
    arrive_before_min  : ผู้โดยสารมาถึงป้ายก่อนเรียนกี่นาที
    origin_stop        : ป้ายต้นทาง (ค่าเริ่มต้น = Dorm)

    Returns
    -------
    list[PassengerDemand]  เรียงตาม arrival_at_stop
    """
    path = Path(xlsx_path)
    if not path.exists():
        raise FileNotFoundError(f"ไม่พบไฟล์ตารางเรียน: {path}")

    xl = pd.ExcelFile(path)
    # หา sheet ที่มีชื่อ "ตารางรายสัปดาห์"
    target_sheet = next((s for s in xl.sheet_names if "ตารางรายสัปดาห์" in s), xl.sheet_names[0])
    raw_df = xl.parse(target_sheet, header=None)

    # หา header row (แถวที่มีคอลัมน์ 'วิชา')
    header_row = None
    for i, row in raw_df.iterrows():
        if row.astype(str).str.contains("วิชา").any() and row.astype(str).str.contains("วัน").any():
            header_row = i
            break
    if header_row is None:
        raise ValueError(f"ไม่พบ header row ใน sheet '{target_sheet}'")

    raw_df.columns = raw_df.iloc[header_row]
    df = raw_df.iloc[header_row + 1:].copy()
    df.columns = [str(c).strip() if not pd.isna(c) else f"_col{i}"
                  for i, c in enumerate(df.columns)]
    df = df.dropna(subset=["วิชา"]).reset_index(drop=True)

    demands: list[PassengerDemand] = []
    pid = 0

    for _, row in df.iterrows():
        course = str(row.get("วิชา", "")).strip()
        section = str(row.get("เซค", "")).strip()
        day = str(row.get("วัน", "")).strip()
        building = str(row.get("ตึก", "")).strip()
        start_time_raw = row.get("เริ่ม", None)

        if not course or not day or pd.isna(start_time_raw):
            continue
        if day_filter and day not in day_filter:
            continue

        class_start = _time_str_to_minutes(start_time_raw)
        if class_start is None:
            continue
        # ข้ามวิชาที่เริ่มเช้าเกิน 06:00 หรือดึกเกิน 22:00
        if class_start < 360 or class_start > 1320:
            continue

        dest_stop = _resolve_destination_stop(building)
        walk_min = _get_walk_time(dest_stop)
        # ผู้โดยสารต้องถึงป้ายปลายทางก่อนเรียน arrive_before_min นาที
        target_arrival = class_start - arrive_before_min
        # ผู้โดยสารมาถึงป้ายต้นทางก่อนหน้านั้น (ให้เวลาเดินทางจาก Dorm)
        # ประมาณจาก graph time (เฉลี่ย 10 นาทีก่อน target_arrival)
        arrival_at_stop = target_arrival - 10.0

        day_idx = DAY_MAP.get(day, 0)

        # สร้าง PassengerDemand หนึ่งรายต่อนักศึกษาหนึ่งคน
        for student_idx in range(students_per_section):
            # กระจายเวลามาถึงป้าย ±5 นาทีรอบค่าเฉลี่ย (จำลองพฤติกรรมจริง)
            spread = (student_idx / max(1, students_per_section - 1) - 0.5) * 10.0
            actual_arrival = arrival_at_stop + spread

            demands.append(PassengerDemand(
                passenger_id=pid,
                origin=origin_stop,
                destination=dest_stop,
                arrival_at_stop=round(actual_arrival, 1),
                class_start_time=class_start,
                walk_time_minutes=walk_min,
                target_arrival=target_arrival,
                course_code=course,
                building=building,
                day_of_week=day_idx,
                section=section,
                group_size=1,
            ))
            pid += 1

    demands.sort(key=lambda d: d.arrival_at_stop)
    return demands


def summarize_demands(demands: list[PassengerDemand]) -> dict:
    """สรุปสถิติของ demand list ที่สร้างขึ้น"""
    if not demands:
        return {"total": 0}
    by_dest: dict[str, int] = {}
    by_course: dict[str, int] = {}
    by_hour: dict[int, int] = {}
    for d in demands:
        by_dest[d.destination] = by_dest.get(d.destination, 0) + 1
        by_course[d.course_code] = by_course.get(d.course_code, 0) + 1
        hr = int(d.class_start_time // 60)
        by_hour[hr] = by_hour.get(hr, 0) + 1
    return {
        "total_passengers": len(demands),
        "unique_courses": len(by_course),
        "by_destination_stop": dict(sorted(by_dest.items())),
        "by_class_hour": dict(sorted(by_hour.items())),
        "by_course": dict(sorted(by_course.items(), key=lambda x: -x[1])[:10]),
        "time_range_min": (min(d.arrival_at_stop for d in demands),
                           max(d.arrival_at_stop for d in demands)),
    }


if __name__ == "__main__":
    demands = load_cs_timetable(
        day_filter=["อังคาร", "พฤหัสบดี"],
        students_per_section=40,
    )
    stats = summarize_demands(demands)
    import json
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    print(f"\nตัวอย่าง 3 รายแรก:")
    for d in demands[:3]:
        print(f"  id={d.passenger_id} | {d.origin}→{d.destination} "
              f"| ถึงป้าย {d.arrival_at_stop:.0f}น. "
              f"| เรียน {d.class_start_time:.0f}น. ({d.course_code})")
