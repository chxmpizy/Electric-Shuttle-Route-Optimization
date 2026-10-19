"""
src/data/timetable.py
======================
อ่านตารางเรียน CS จาก Excel แล้วแปลงเป็นรายการ PassengerDemand

อ้างอิงวิธีคำนวณเวลาจาก:
  Díaz-Ramírez et al. (2022) "A smart school routing and scheduling problem
  for the new normalcy", Computers & Industrial Engineering 168, 108101.
  DOI: 10.1016/j.cie.2022.108101

  Section 3.1: arrival window ที่ถูกต้องคือช่วงเวลาที่ผู้โดยสาร
               มาถึงได้ "สมเหตุสมผล" — ไม่ช้าเกิน (สาย) ไม่เร็วเกิน (รอนาน)
  Section 3.3: สมการพื้นฐาน
      arrival_at_building = drop_time + walk_time_to_building
      delay               = max(0, arrival_at_building - class_start_time)

  วิธีกำหนดเวลามาถึงป้าย (สอดคล้องกับ paper Section 3.1 & 5.1):
      travel_time_est     = Shortest-Path บนกราฟ (Haversine × routing_factor)
                            ← paper ใช้ Google Maps API ส่วนเราใช้ OSM-derived graph
      target_at_stop      = class_start - walk_time - travel_time_est - buffer_min
      arrival_at_stop(i)  = target_at_stop + spread(i)   ← กระจาย ±spread_half นาที
                            (สมมติฐาน: นักศึกษาไม่มาพร้อมกันทุกคน)

  หลักการ "ไม่เร็วเกินไป" (Comfort Early Bound ตาม paper Section 3.2):
      comfortable_deadline = class_start - arrive_before_min
"""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd
import networkx as nx

# ─── Timing parameters (อ้างอิง Díaz-Ramírez et al. 2022) ──────────────────
BUFFER_MIN: float = 5.0          # เผื่อเวลาเดินทางไม่แน่นอน (นาที) → paper ใช้ time-window
ARRIVE_BEFORE_MIN: float = 10.0  # ต้องการถึงก่อนเรียนกี่นาที (Comfort Early Bound)
SPREAD_HALF_MIN: float = 5.0     # กระจายเวลามาถึงป้าย ±5 นาที (สมมติฐาน)
PREPARATION_MIN: float = 3.0     # เวลาเตรียมตัวและเดินจากหอพักถึงป้าย

# ─── Walk time from bus stop to building (นาที) ─────────────────────────────
WALK_TIME_MIN: dict[str, float] = {
    "Lecture":  3.0,   # LC1–LC5
    "SC2_SC3":  4.0,   # SC2, SC3, SC4
    "SC1":      5.0,   # SC1
    "Social":   3.0,   # คณะสังคมศาสตร์ ฯลฯ
    "Health":   5.0,   # กลุ่มวิทยาศาสตร์สุขภาพ
    "Hospital": 4.0,   # โรงพยาบาล มธ.
    "Library":  2.0,
    "Convention": 3.0,
}
DEFAULT_WALK_MIN: float = 5.0

# ─── Building code → Bus stop ────────────────────────────────────────────────
BUILDING_TO_STOP: dict[str, str] = {
    "LC": "Lecture", "LC1": "Lecture", "LC2": "Lecture",
    "LC3": "Lecture", "LC4": "Lecture", "LC5": "Lecture",
    "SC": "SC2_SC3",  "SC1": "SC1",    "SC2": "SC2_SC3",
    "SC3": "SC2_SC3", "SC4": "SC2_SC3","SC5": "SC2_SC3",
    "SOC": "Social",  "HUM": "Social",
    "HEA": "Health",  "MED": "Health",  "NUR": "Health",
    "HOSP": "Hospital",
    "LIB": "Library", "CONV": "Convention",
}
DEFAULT_DEST_STOP = "SC2_SC3"
DEFAULT_ORIGIN_STOP = "Dorm"

# ─── Section size: Limited vs General ────────────────────────────────────────
# วิชาที่ขึ้นต้นด้วย prefix เหล่านี้ถือว่า "วิชาทั่วไป" ไม่จำกัดเซค → ขนาดใหญ่กว่า
GENERAL_COURSE_PREFIXES = ("TU", "EL", "EN", "LA", "SC1", "MA", "PH")
LIMITED_SECTION_SIZE = 50      # วิชา CS/IT เฉพาะทาง
GENERAL_SECTION_SIZE = 120     # วิชาทั่วไป (TU100, EL105 ฯลฯ)

# ─── Day name → index ────────────────────────────────────────────────────────
DAY_MAP = {
    "จันทร์": 0, "อังคาร": 1, "พุธ": 2,
    "พฤหัสบดี": 3, "ศุกร์": 4, "เสาร์": 5, "อาทิตย์": 6,
}


@dataclass
class PassengerDemand:
    """ความต้องการเดินทางของผู้โดยสารหนึ่งคน"""
    passenger_id: int
    origin: str
    destination: str
    arrival_at_stop: float      # นาทีจากเที่ยงคืน — เวลาผู้โดยสารมาถึงป้ายต้นทาง
    class_start_time: float     # นาทีจากเที่ยงคืน — เวลาเริ่มเรียน
    walk_time_minutes: float    # นาที — เดินจากป้ายถึงอาคาร
    target_arrival: float       # นาที — เวลาที่อยากถึงก่อนเรียน (class_start - buffer)
    travel_time_estimate: float = 0.0  # นาที — เวลาเดินทางจากกราฟ (อ้างอิง paper)
    course_code: str = ""
    building: str = ""
    day_of_week: int = 0
    section: str = ""
    is_general_course: bool = False
    group_size: int = 1


def _time_str_to_minutes(t) -> Optional[float]:
    """แปลง '08:00:00' → 480.0"""
    if pd.isna(t):
        return None
    parts = str(t).strip().split(":")
    try:
        return float(int(parts[0]) * 60 + int(parts[1]))
    except Exception:
        return None


def _resolve_stop(building_code: str) -> str:
    if not isinstance(building_code, str) or not building_code.strip():
        return DEFAULT_DEST_STOP
    code = building_code.strip().upper()
    if code in BUILDING_TO_STOP:
        return BUILDING_TO_STOP[code]
    for prefix, stop in BUILDING_TO_STOP.items():
        if code.startswith(prefix.upper()):
            return stop
    return DEFAULT_DEST_STOP


def _is_general(course_code: str) -> bool:
    return any(course_code.upper().startswith(p) for p in GENERAL_COURSE_PREFIXES)


def _get_travel_time(graph: Optional[nx.DiGraph], origin: str, dest: str) -> float:
    """
    คำนวณเวลาเดินทางโดยประมาณจากกราฟ (Shortest Path)
    อ้างอิง: paper ใช้ Google Maps API — เราใช้ OSM-derived DiGraph แทน
    """
    if graph is None:
        return 15.0  # fallback ถ้าไม่มีกราฟ
    try:
        return float(nx.shortest_path_length(graph, origin, dest, weight="weight"))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return 15.0


def load_cs_timetable(
    xlsx_path: str | Path = "data/raw/cs_timetable.xlsx",
    day_filter: Optional[list[str]] = None,
    origin_stop: str = DEFAULT_ORIGIN_STOP,
    graph: Optional[nx.DiGraph] = None,
    buffer_min: float = BUFFER_MIN,
    arrive_before_min: float = ARRIVE_BEFORE_MIN,
    spread_half_min: float = SPREAD_HALF_MIN,
    limited_section_size: int = LIMITED_SECTION_SIZE,
    general_section_size: int = GENERAL_SECTION_SIZE,
) -> list[PassengerDemand]:
    """
    อ่านตาราง CS จาก Excel → list[PassengerDemand]

    การคำนวณเวลา (อ้างอิง Díaz-Ramírez et al. 2022, Section 3.1 & 3.3):

        travel_time_est   = shortest_path(origin_stop → dest_stop)   [จากกราฟ]
        walk_time         = WALK_TIME_MIN[dest_stop]                  [สมมติฐาน]
        target_at_stop    = class_start
                            - walk_time          (เดินจากป้ายถึงอาคาร)
                            - travel_time_est    (บนรถ)
                            - buffer_min         (เผื่อไม่แน่นอน)
                            - arrive_before_min  (Comfort Early Bound)
        arrival_at_stop(i)= target_at_stop
                            + spread(i, ±spread_half_min)   (กระจายไม่มาพร้อมกัน)
                            - preparation_min                (เดินจากหอถึงป้าย)
    """
    path = Path(xlsx_path)
    if not path.exists():
        raise FileNotFoundError(f"ไม่พบ: {path}")

    xl = pd.ExcelFile(path)
    sheet = next((s for s in xl.sheet_names if "ตารางรายสัปดาห์" in s), xl.sheet_names[0])
    raw = xl.parse(sheet, header=None)

    header_row = None
    for i, row in raw.iterrows():
        if row.astype(str).str.contains("วิชา").any() and row.astype(str).str.contains("วัน").any():
            header_row = i
            break
    if header_row is None:
        raise ValueError(f"ไม่พบ header ใน sheet '{sheet}'")

    raw.columns = raw.iloc[header_row]
    df = raw.iloc[header_row + 1:].copy()
    df.columns = [str(c).strip() if not pd.isna(c) else f"_c{i}"
                  for i, c in enumerate(df.columns)]
    df = df.dropna(subset=["วิชา"]).reset_index(drop=True)

    demands: list[PassengerDemand] = []
    pid = 0

    for _, row in df.iterrows():
        course = str(row.get("วิชา", "")).strip()
        section = str(row.get("เซค", "")).strip()
        day = str(row.get("วัน", "")).strip()
        building = str(row.get("ตึก", "")).strip()
        start_raw = row.get("เริ่ม", None)

        if not course or not day or pd.isna(start_raw):
            continue
        if day_filter and day not in day_filter:
            continue

        class_start = _time_str_to_minutes(start_raw)
        if class_start is None or class_start < 360 or class_start > 1320:
            continue

        general = _is_general(course)
        n_students = general_section_size if general else limited_section_size
        dest_stop = _resolve_stop(building)
        walk_min = WALK_TIME_MIN.get(dest_stop, DEFAULT_WALK_MIN)
        day_idx = DAY_MAP.get(day, 0)

        # ─── คำนวณเวลา (อ้างอิง paper Section 3.1 & 3.3) ────────────────
        travel_est = _get_travel_time(graph, origin_stop, dest_stop)
        target_at_stop = (
            class_start
            - walk_min           # เดินจากป้ายถึงอาคาร
            - travel_est         # เวลาบนรถ (จากกราฟ)
            - buffer_min         # เผื่อความไม่แน่นอน
            - arrive_before_min  # Comfort Early Bound (ถึงก่อนเรียน)
        )
        target_arrival = class_start - arrive_before_min

        for idx in range(n_students):
            # กระจายเวลา: นักศึกษาคนแรกมาเร็วสุด คนสุดท้ายมาช้าสุด
            frac = idx / max(1, n_students - 1)           # 0.0 → 1.0
            spread = (frac - 0.5) * 2 * spread_half_min   # -spread_half → +spread_half
            arrival = target_at_stop + spread - PREPARATION_MIN

            demands.append(PassengerDemand(
                passenger_id=pid,
                origin=origin_stop,
                destination=dest_stop,
                arrival_at_stop=round(arrival, 1),
                class_start_time=class_start,
                walk_time_minutes=walk_min,
                target_arrival=target_arrival,
                travel_time_estimate=round(travel_est, 1),
                course_code=course,
                building=building,
                day_of_week=day_idx,
                section=section,
                is_general_course=general,
                group_size=1,
            ))
            pid += 1

    demands.sort(key=lambda d: d.arrival_at_stop)
    return demands


def summarize_demands(demands: list[PassengerDemand]) -> dict:
    if not demands:
        return {"total": 0}
    by_dest: dict[str, int] = {}
    by_course: dict[str, int] = {}
    by_hour: dict[int, int] = {}
    limited_count = 0
    general_count = 0
    for d in demands:
        by_dest[d.destination] = by_dest.get(d.destination, 0) + 1
        by_course[d.course_code] = by_course.get(d.course_code, 0) + 1
        hr = int(d.class_start_time // 60)
        by_hour[hr] = by_hour.get(hr, 0) + 1
        if d.is_general_course:
            general_count += 1
        else:
            limited_count += 1
    # Show timing reference for first demand
    sample = demands[0]
    timing_ref = {
        "example_course": sample.course_code,
        "class_start_min": sample.class_start_time,
        "travel_time_est_min": sample.travel_time_estimate,
        "walk_time_min": sample.walk_time_minutes,
        "arrival_at_stop_min": sample.arrival_at_stop,
        "interpretation": (
            f"นักศึกษามาถึงป้ายเวลา {sample.arrival_at_stop:.0f} นาที "
            f"({sample.arrival_at_stop/60:.2f} น.) "
            f"เพื่อขึ้นรถ → เดินทาง ~{sample.travel_time_estimate:.1f} นาที "
            f"→ เดิน {sample.walk_time_minutes:.0f} นาที "
            f"→ ถึงอาคารก่อนเรียน {sample.class_start_time/60:.2f} น."
        )
    }
    return {
        "total_passengers": len(demands),
        "limited_course_passengers": limited_count,
        "general_course_passengers": general_count,
        "unique_courses": len(by_course),
        "by_destination_stop": dict(sorted(by_dest.items())),
        "by_class_hour": dict(sorted(by_hour.items())),
        "top_courses": dict(sorted(by_course.items(), key=lambda x: -x[1])[:8]),
        "time_range_min": (
            min(d.arrival_at_stop for d in demands),
            max(d.arrival_at_stop for d in demands),
        ),
        "timing_reference": timing_ref,
    }


if __name__ == "__main__":
    import json, sys
    sys.path.insert(0, ".")
    from src.data.graph import build_graph, make_bidirectional
    graph = make_bidirectional(build_graph())
    demands = load_cs_timetable(graph=graph)
    stats = summarize_demands(demands)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
