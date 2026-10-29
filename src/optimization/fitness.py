"""Multi-objective fitness function สำหรับประเมินตารางเดินรถ

สูตร:
    cost = W_WAIT   * avg_wait   / NORM_WAIT
         + W_TRAVEL * avg_travel / NORM_TRAVEL
         + W_DELAY  * avg_delay  / NORM_DELAY
         + PENALTY_UNSERVED * unserved_ratio
         + FLEET_COST * total_buses

ค่า cost ยิ่งต่ำ = ตารางเดินรถยิ่งดี
"""
from __future__ import annotations

# น้ำหนักของแต่ละ objective (Config F จากผล sensitivity analysis — on-time 90.5%)
W_WAIT = 0.30            # เวลารอเฉลี่ย
W_TRAVEL = 0.00          # เวลาเดินทางเฉลี่ย (ปิด ตาม sensitivity: travel-heavy ทำ on-time ร่วง)
W_DELAY = 0.70           # นาทีเข้าเรียนสายเฉลี่ย
PENALTY_UNSERVED = 60.0  # โทษต่อสัดส่วนผู้โดยสารตกค้าง
FLEET_COST = 0.0         # ต้นทุนต่อจำนวนรถที่ใช้

# ตัวหารสำหรับ normalize ให้แต่ละ term อยู่ในสเกลเดียวกัน (นาที)
NORM_WAIT = 15.0
NORM_TRAVEL = 20.0
NORM_DELAY = 10.0


def fitness(result: dict, total_buses: int = 0) -> float:
    """คำนวณคะแนน cost จากผลการจำลอง (ยิ่งต่ำยิ่งดี)"""
    total = result.get("total_passengers", 0)
    served = result.get("served_passengers", 0)
    stranded = result.get("stranded_passengers", 0)

    # ไม่มีผู้โดยสารหรือไม่มีคนขึ้นรถเลย → คืนค่าคะแนนแย่สุด
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
    """คืนค่าแต่ละ component ของ cost สำหรับการ debug/นำเสนอ"""
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
