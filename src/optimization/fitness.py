"""Multi-objective fitness function สำหรับประเมินตารางเดินรถ

แบ่งผู้โดยสารเป็น 3 กรณี (ดู Passenger.outcome):
    1. ON_TIME  — มาทันป้ายและขึ้นรถทัน          → ไม่มีโทษ
    2. MISSED   — มาไม่ทันป้าย (รถรอบที่ทันออกไปแล้ว) → โทษ W_MISSED
    3. BUS_FULL — มาทันป้ายแต่รถเต็ม ขึ้นต่อไม่ได้   → โทษ W_BUS_FULL

สูตร:
    cost = W_MISSED   * missed_ratio
         + W_BUS_FULL * bus_full_ratio
         + W_WAIT     * avg_wait  / NORM_WAIT
         + W_TRAVEL   * avg_travel / NORM_TRAVEL
         + W_DELAY    * avg_delay / NORM_DELAY
         + FLEET_COST * total_buses

ค่า cost ยิ่งต่ำ = ตารางเดินรถยิ่งดี
"""
from __future__ import annotations

# น้ำหนักของ 3 กรณี (ต่อสัดส่วนผู้โดยสารทั้งหมด)
W_MISSED = 40.0          # มาไม่ทันป้าย — ลดได้ด้วย headway ที่ถี่ขึ้น/เวลาออกรถที่ตรงคาบเรียน
W_BUS_FULL = 60.0        # รถเต็ม — ผู้โดยสารทำถูกแล้วแต่ระบบรับไม่ไหว จึงโทษหนักกว่า

# น้ำหนักรอง ใช้แยกคำตอบที่สัดส่วน 3 กรณีใกล้กัน
W_WAIT = 0.30            # เวลารอเฉลี่ย
W_TRAVEL = 0.00          # เวลาเดินทางเฉลี่ย (ปิด ตาม sensitivity: travel-heavy ทำ on-time ร่วง)
W_DELAY = 0.70           # นาทีเข้าเรียนสายเฉลี่ย (คนที่สาย สายมากแค่ไหน)
FLEET_COST = 0.0         # ต้นทุนต่อจำนวนรถที่ใช้

# ตัวหารสำหรับ normalize ให้แต่ละ term อยู่ในสเกลเดียวกัน (นาที)
NORM_WAIT = 15.0
NORM_TRAVEL = 20.0
NORM_DELAY = 10.0


def fitness(result: dict, total_buses: int = 0) -> float:
    """คำนวณคะแนน cost จากผลการจำลอง (ยิ่งต่ำยิ่งดี)"""
    total = result.get("total_passengers", 0)
    served = result.get("served_passengers", 0)

    # ไม่มีผู้โดยสารหรือไม่มีคนขึ้นรถเลย → คืนค่าคะแนนแย่สุด
    if total == 0 or served == 0:
        return 9999.0

    missed_ratio = result.get("case_missed", 0) / total
    bus_full_ratio = result.get("case_bus_full", 0) / total
    avg_wait = result.get("avg_wait_time", 0.0)
    avg_travel = result.get("avg_travel_time", 0.0)
    avg_delay = result.get("avg_delay_minutes", 0.0)

    cost = (
        (W_MISSED * missed_ratio) +
        (W_BUS_FULL * bus_full_ratio) +
        (W_WAIT * (avg_wait / NORM_WAIT)) +
        (W_TRAVEL * (avg_travel / NORM_TRAVEL)) +
        (W_DELAY * (avg_delay / NORM_DELAY)) +
        (FLEET_COST * total_buses)
    )
    return round(cost, 4)


def fitness_breakdown(result: dict, total_buses: int = 0) -> dict:
    """คืนค่าแต่ละ component ของ cost สำหรับการ debug/นำเสนอ"""
    total = max(1, result.get("total_passengers", 1))
    on_time = result.get("case_on_time", 0)
    missed = result.get("case_missed", 0)
    bus_full = result.get("case_bus_full", 0)
    avg_wait = result.get("avg_wait_time", 0.0)
    avg_travel = result.get("avg_travel_time", 0.0)
    avg_delay = result.get("avg_delay_minutes", 0.0)

    return {
        "missed_component":   round(W_MISSED * missed / total, 4),
        "bus_full_component": round(W_BUS_FULL * bus_full / total, 4),
        "wait_component":     round(W_WAIT * (avg_wait / NORM_WAIT), 4),
        "travel_component":   round(W_TRAVEL * (avg_travel / NORM_TRAVEL), 4),
        "delay_component":    round(W_DELAY * (avg_delay / NORM_DELAY), 4),
        "fleet_component":    round(FLEET_COST * total_buses, 4),
        "total_cost":         fitness(result, total_buses),
        "case_on_time_pct":   round(on_time / total * 100, 2),
        "case_missed_pct":    round(missed / total * 100, 2),
        "case_bus_full_pct":  round(bus_full / total * 100, 2),
        "on_time_rate_pct":   result.get("on_time_rate_pct", 0.0),
    }
