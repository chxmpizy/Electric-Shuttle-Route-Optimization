"""
cs_pilot_test.py
=================
ทดลองครบกระบวนการสำหรับ CS Department (Pilot Run)

ตารางเรียน CS → ผู้โดยสารพร้อมเวลาเรียน
→ Simulation → ผลทัน/สาย/ตกค้าง → Goal function

รัน: python cs_pilot_test.py
"""
import sys, os
sys.path.insert(0, "src")

import json
import time
from pathlib import Path

from data.timetable import load_cs_timetable, summarize_demands
from data.graph import build_graph, make_bidirectional
from data.routes import build_fixed_routes, get_all_stops, HUB_STOPS
from optimization.context import RouteContext
from optimization.fitness import fitness, fitness_breakdown
from simulation.engine import run_simulation

print("=" * 65)
print("  UniFlow EV — CS Department Pilot Test")
print("=" * 65)

# ─── 1. โหลดตารางเรียน CS ────────────────────────────────────────────────────
print("\n[1] โหลดตารางเรียน CS ...")
t0 = time.time()
demands = load_cs_timetable(
    xlsx_path="data/raw/cs_timetable.xlsx",
    day_filter=["อังคาร", "พฤหัสบดี"],   # เริ่มจาก 2 วันก่อน
    students_per_section=40,
    arrive_before_min=15.0,
)
stats = summarize_demands(demands)
print(f"  โหลดเสร็จใน {time.time()-t0:.2f}s")
print(f"  ผู้โดยสารทั้งหมด : {stats['total_passengers']:,} คน")
print(f"  วิชาที่มี       : {stats['unique_courses']} วิชา")
print(f"  ช่วงเวลาถึงป้าย : {stats['time_range_min'][0]:.0f}–{stats['time_range_min'][1]:.0f} นาที")
print(f"  ปลายทาง       : {stats['by_destination_stop']}")
print(f"  ชั่วโมงเรียนยอดนิยม: {dict(list(stats['by_class_hour'].items())[:5])}")

# ─── 2. สร้างกราฟและเส้นทาง ──────────────────────────────────────────────────
print("\n[2] สร้าง Network Graph ...")
graph = make_bidirectional(build_graph())
stops = get_all_stops()
fixed_routes = build_fixed_routes(graph)

# simulation_time = ช่วงเวลาจำลอง (นาที จากเที่ยงคืน → ครอบคลุมทุก demand)
max_t = max(int(d.class_start_time) + 60 for d in demands)
sim_time = max(max_t, 900)   # อย่างน้อย 15:00 น.
print(f"  Stops: {len(stops)} ป้าย | Routes: {len(fixed_routes)} สาย | Sim window: {sim_time} นาที ({sim_time/60:.1f} ชม.)")

# ─── 3. เตรียม RouteContext ───────────────────────────────────────────────────
ctx = RouteContext(
    graph=graph,
    stops=stops,
    hub_stops=HUB_STOPS,
    num_routes=len(fixed_routes),
    min_per_route=1,
    max_per_route=8,
    total_buses=30,
    start_time=420,
    end_time=sim_time,
)

# ─── 4. รัน Simulation กับ Baseline Schedule ─────────────────────────────────
print("\n[3] รัน Simulation (Baseline) ...")
# แปลง fixed_routes เป็น active_routes format
active_routes = []
for r in fixed_routes:
    active_routes.append({
        "path":      r["path"],
        "num_bus":   r.get("num_bus", 5),
        "cycle_time": r.get("cycle_time", 60),
        "headway":   r.get("headway", 12),
        "startTime": 420,
        "endTime":   sim_time,
    })

t0 = time.time()
result = run_simulation(
    active_routes=active_routes,
    stops=stops,
    simulation_time=sim_time,
    passenger_demands=demands,
    graph=graph,
    seed=42,
)
elapsed = time.time() - t0

# ─── 5. แสดงผลลัพธ์ ──────────────────────────────────────────────────────────
print(f"  รันเสร็จใน {elapsed:.2f}s\n")
print("  ─── ผลการจำลอง ───────────────────────────────────────")
print(f"  ผู้โดยสารทั้งหมด    : {result['total_passengers']:>6,} คน")
print(f"  ถึงปลายทางสำเร็จ   : {result['served_passengers']:>6,} คน")
print(f"  ตกค้าง (stranded)  : {result['stranded_passengers']:>6,} คน")
print(f"  เวลารอเฉลี่ย        : {result['avg_wait_time']:>6.1f} นาที")
print(f"  เวลาเดินทางเฉลี่ย   : {result['avg_travel_time']:>6.1f} นาที")
print()
print(f"  ─── ผลเข้าเรียน ──────────────────────────────────────")
print(f"  มีข้อมูลเวลาเรียน   : {result['passengers_with_class']:>6,} คน")
print(f"  ✅ เข้าเรียนทัน     : {result['on_time_passengers']:>6,} คน  ({result['on_time_rate_pct']:.1f}%)")
print(f"  ❌ เข้าเรียนสาย     : {result['late_passengers']:>6,} คน")
print(f"  ⏱  นาทีสายเฉลี่ย   : {result['avg_delay_minutes']:>6.1f} นาที")
print(f"  ⏱  สายสูงสุด       : {result['max_delay_minutes']:>6.1f} นาที")

# ─── 6. แสดง Fitness Breakdown ────────────────────────────────────────────────
total_buses = sum(r.get("num_bus", 5) for r in active_routes)
breakdown = fitness_breakdown(result, total_buses=total_buses)
print(f"\n  ─── Fitness Breakdown ────────────────────────────────")
for k, v in breakdown.items():
    print(f"  {k:<25}: {v}")

# ─── 7. บันทึก Event Log สั้น ๆ ──────────────────────────────────────────────
log = result.get("event_log", [])
print(f"\n  Event log: {len(log)} events")
if log:
    print("  ตัวอย่าง 3 events แรก:")
    for ev in log[:3]:
        print(f"    t={ev['t']:.0f}น. | bus#{ev['bus_id']} | ป้าย={ev['stop']} "
              f"| ขึ้น={ev['boarded']} ลง={ev['alighted']} "
              f"| บนรถ={ev['on_bus']} | รอ={ev['queue_remaining']}")

# ─── 8. บันทึกผลเป็น JSON ────────────────────────────────────────────────────
out_path = Path("cs_pilot_result.json")
result_summary = {k: v for k, v in result.items() if k != "event_log"}
result_summary["fitness_breakdown"] = breakdown
result_summary["demand_stats"] = stats
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result_summary, f, ensure_ascii=False, indent=2)
print(f"\n  บันทึกผลไว้ที่: {out_path}")
print("\n" + "=" * 65)
