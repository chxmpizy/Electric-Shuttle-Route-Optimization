"""
src/optimization/fitness.py
============================
Multi-Objective Fitness Function ตาม Feedback อาจารย์

Priority (ตามลำดับความสำคัญ):
  1. ผู้โดยสารถึงปลายทางครบ (ลงโทษหนักเมื่อมีคนตกค้าง)
  2. เข้าเรียนทัน (ค่าปรับตามจำนวนนาทีที่สาย)
  3. เวลารอและเวลาเดินทางเหมาะสม
  4. จำนวนรถที่ใช้ (ปรับได้)

สูตร:
  cost = w_wait * avg_wait/norm_w
       + w_travel * avg_travel/norm_t
       + w_delay * avg_delay/norm_d
       + penalty_unserved * unserved_ratio
       + fleet_cost * total_buses

Lower cost = Better solution
"""
from __future__ import annotations

# ─── Weight configuration ─────────────────────────────────────────────────────
W_WAIT = 0.20           # เวลารอเฉลี่ย
W_TRAVEL = 0.15         # เวลาเดินทางเฉลี่ย
W_DELAY = 0.35          # นาทีสายเฉลี่ย (สำคัญที่สุดด้าน Quality)
PENALTY_UNSERVED = 60.0 # โทษต่อผู้โดยสาร 1 คนที่ตกค้าง (เทียบเท่าสาย 60 นาที)
FLEET_COST = 0.0        # ต้นทุนต่อรถ 1 คัน (ปิดอยู่, เปิดเมื่อทำ fleet minimization)

# ─── Normalization denominators ───────────────────────────────────────────────
NORM_WAIT = 15.0    # เวลารอเฉลี่ย "ยอมรับได้" (นาที)
NORM_TRAVEL = 20.0  # เวลาเดินทางเฉลี่ย "ยอมรับได้" (นาที)
NORM_DELAY = 10.0   # นาทีสายเฉลี่ย "ยอมรับได้" (นาที)


def fitness(result: dict, total_buses: int = 0) -> float:
    """
    คำนวณคะแนน (ยิ่งต่ำยิ่งดี) จากผลการจำลอง

    Parameters
    ----------
    result      : dict จาก run_simulation()
    total_buses : จำนวนรถรวม (ใช้เมื่อเปิด FLEET_COST)

    Returns
    -------
    float  cost score (lower = better)
    """
    total = result.get("total_passengers", 0)
    served = result.get("served_passengers", 0)
    stranded = result.get("stranded_passengers", 0)

    # กรณีไม่มีผู้โดยสารเลย — ให้คะแนนแย่มาก
    if total == 0 or served == 0:
        return 9999.0

    avg_wait = result.get("avg_wait_time", 0.0)
    avg_travel = result.get("avg_travel_time", 0.0)
    avg_delay = result.get("avg_delay_minutes", 0.0)
    unserved_ratio = stranded / total

    cost = (
        (W_WAIT * (avg_wait / NORM_WAIT)) +
        (W_TRAVEL * (avg_travel / NORM_TRAVEL)) +
        (W_DELAY * (avg_delay / NORM_DELAY)) +
        (PENALTY_UNSERVED * unserved_ratio) +
        (FLEET_COST * total_buses)
    )
    return round(cost, 4)


def fitness_breakdown(result: dict, total_buses: int = 0) -> dict:
    """
    แสดงส่วนประกอบแต่ละส่วนของคะแนน สำหรับ Debug และ Presentation
    """
    total = result.get("total_passengers", 1)
    stranded = result.get("stranded_passengers", 0)
    avg_wait = result.get("avg_wait_time", 0.0)
    avg_travel = result.get("avg_travel_time", 0.0)
    avg_delay = result.get("avg_delay_minutes", 0.0)
    unserved_ratio = stranded / max(1, total)

    return {
        "wait_component":     round(W_WAIT * (avg_wait / NORM_WAIT), 4),
        "travel_component":   round(W_TRAVEL * (avg_travel / NORM_TRAVEL), 4),
        "delay_component":    round(W_DELAY * (avg_delay / NORM_DELAY), 4),
        "unserved_penalty":   round(PENALTY_UNSERVED * unserved_ratio, 4),
        "fleet_component":    round(FLEET_COST * total_buses, 4),
        "total_cost":         fitness(result, total_buses),
        "on_time_rate_pct":   result.get("on_time_rate_pct", 0.0),
        "unserved_ratio_pct": round(unserved_ratio * 100, 2),
    }