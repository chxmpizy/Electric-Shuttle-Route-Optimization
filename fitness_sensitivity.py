"""
fitness_sensitivity.py
=======================
Sensitivity analysis สำหรับน้ำหนักใน fitness function
ตอบ feedback #1 ของอาจารย์: "ทำไมถึงเลือกน้ำหนักค่าหนึ่ง"

วิธี:
  - รัน GA ด้วย weight configuration ต่างๆ บน CS demand ชุดเดียวกัน
  - เก็บ: on-time %, stranded, avg_delay, avg_wait, total_buses
  - เปรียบเทียบว่าการเลือกน้ำหนักต่างๆ ส่งผลต่อคำตอบที่ค้นเจออย่างไร

รัน: python fitness_sensitivity.py
"""
import sys, time, json, random
sys.path.insert(0, "src")

from data.timetable import load_cs_timetable
from data.graph import build_graph, make_bidirectional
from data.routes import build_fixed_routes, get_all_stops, HUB_STOPS
from optimization.context import RouteContext
# ─── IMPORTANT: optimization/__init__.py ทำ `from .fitness import fitness`
# ซึ่ง shadow ชื่อ `optimization.fitness` ให้กลายเป็น function แทนที่จะเป็น submodule
# ต้อง bypass ด้วยการ import ตรงจาก submodule
import importlib
fit_mod = importlib.import_module("optimization.fitness")
from optimization.fitness import fitness_breakdown
from simulation.engine import run_simulation
from algorithms.GA import run_ga

# ─── Weight configurations to test ──────────────────────────────────────────
# แต่ละชุดคือ (name, W_WAIT, W_TRAVEL, W_DELAY)
CONFIGS = [
    ("A: current",         0.20, 0.15, 0.35),   # ที่ใช้อยู่ (delay-weighted)
    ("B: equal",           0.33, 0.33, 0.33),   # เท่ากันหมด
    ("C: delay-only",      0.00, 0.00, 1.00),   # เน้นสายอย่างเดียว
    ("D: wait-heavy",      0.50, 0.10, 0.10),   # เน้นเวลารอ (ของ paper abstract 0.3/0.7 เพี้ยน → ลองดูเน้นรอ)
    ("E: travel-heavy",    0.10, 0.50, 0.10),   # เน้นเวลาเดินทาง
    ("F: paper abstract",  0.30, 0.00, 0.70),   # 0.3/0.7 — paper abstract
    ("G: paper method",    0.50, 0.00, 0.50),   # 0.5/0.5 — paper methodology
    ("H: delay-dominant",  0.10, 0.10, 0.60),   # delay มาก wait/travel น้อย
]

GA_GENS = 10
SEED = 42
OUTPUT_FILE = "fitness_sensitivity_result.json"


def eval_full(chromosome: list[dict], demands, stops, graph, sim_time: int) -> dict:
    active = [{
        "path": g["path"], "num_bus": g["num_bus"],
        "cycle_time": g["cycle_time"], "headway": g["headway"],
        "startTime": g["startTime"], "endTime": g["endTime"],
    } for g in chromosome]
    total_buses = sum(g["num_bus"] for g in chromosome)
    result = run_simulation(
        active_routes=active, stops=stops,
        simulation_time=sim_time,
        passenger_demands=demands, graph=graph, seed=SEED,
    )
    bd = fitness_breakdown(result, total_buses=total_buses)
    return {
        "total_buses": total_buses,
        "on_time_pct": result["on_time_rate_pct"],
        "served": result["served_passengers"],
        "stranded": result["stranded_passengers"],
        "late": result["late_passengers"],
        "avg_wait": result["avg_wait_time"],
        "avg_travel": result["avg_travel_time"],
        "avg_delay": result["avg_delay_minutes"],
        "fleet_util": result.get("fleet_utilization_pct", 0.0),
        "breakdown": bd,
    }


def main():
    print("=" * 70)
    print("  Fitness Weight Sensitivity Analysis")
    print("=" * 70)
    graph = make_bidirectional(build_graph())
    stops = get_all_stops()
    fixed_routes = build_fixed_routes(graph)
    demands = load_cs_timetable(
        xlsx_path="data/raw/cs_timetable.xlsx",
        day_filter=["อังคาร", "พฤหัสบดี"],
        graph=graph,
    )
    max_t = max(int(d.class_start_time) + 60 for d in demands)
    sim_time = max(max_t, 900)

    print(f"CS demand : {len(demands)} ผู้โดยสาร")
    print(f"Sim window: {sim_time} นาที")
    print(f"GA gens   : {GA_GENS}, seed={SEED}")

    results = []
    for cfg_name, w_wait, w_travel, w_delay in CONFIGS:
        print(f"\n── {cfg_name}  W_WAIT={w_wait}, W_TRAVEL={w_travel}, W_DELAY={w_delay} ─")
        # เปลี่ยนน้ำหนักใน fitness module ก่อนรัน GA
        fit_mod.W_WAIT = w_wait
        fit_mod.W_TRAVEL = w_travel
        fit_mod.W_DELAY = w_delay

        ctx = RouteContext(
            graph=graph, stops=stops, hub_stops=HUB_STOPS,
            num_routes=len(fixed_routes),
            min_per_route=1, max_per_route=8, total_buses=30,
            start_time=420, end_time=sim_time,
            passenger_demands=demands, eval_seed=SEED,
        )

        random.seed(SEED)
        t0 = time.time()
        solution, best_score, history = run_ga(ctx, generations=GA_GENS)
        elapsed = time.time() - t0

        full_res = eval_full(solution, demands, stops, graph, sim_time)

        row = {
            "config": cfg_name,
            "weights": {"W_WAIT": w_wait, "W_TRAVEL": w_travel, "W_DELAY": w_delay},
            "ga_best_score": round(best_score, 4),
            "elapsed_sec": round(elapsed, 2),
            **full_res,
        }
        results.append(row)
        print(f"  → on-time={full_res['on_time_pct']}%  "
              f"stranded={full_res['stranded']}  "
              f"delay={full_res['avg_delay']:.1f}m  "
              f"wait={full_res['avg_wait']:.1f}m  "
              f"buses={full_res['total_buses']}  "
              f"({elapsed:.1f}s)")

    # Reset weights to default
    fit_mod.W_WAIT = 0.20
    fit_mod.W_TRAVEL = 0.15
    fit_mod.W_DELAY = 0.35

    # ─── Summary table ─────────────────────────────────────────────────────
    print("\n" + "=" * 90)
    print("  📊 SUMMARY: น้ำหนักต่างๆ ส่งผลต่อคำตอบที่ค้นเจออย่างไร")
    print("=" * 90)
    print(f"{'Config':<20} {'On-Time%':<10} {'Stranded':<10} {'Delay(m)':<10} "
          f"{'Wait(m)':<10} {'Buses':<7} {'Score':<10}")
    print("-" * 90)
    for r in results:
        print(f"{r['config']:<20} {r['on_time_pct']:<10.1f} {r['stranded']:<10} "
              f"{r['avg_delay']:<10.1f} {r['avg_wait']:<10.1f} "
              f"{r['total_buses']:<7} {r['ga_best_score']:<10.4f}")

    # ─── Save ───────────────────────────────────────────────────────────────
    output = {
        "metadata": {
            "experiment": "Fitness weight sensitivity analysis",
            "demand_size": len(demands),
            "sim_window_min": sim_time,
            "ga_generations": GA_GENS,
            "seed": SEED,
            "fixed_values": {
                "PENALTY_UNSERVED": fit_mod.PENALTY_UNSERVED,
                "NORM_WAIT": fit_mod.NORM_WAIT,
                "NORM_TRAVEL": fit_mod.NORM_TRAVEL,
                "NORM_DELAY": fit_mod.NORM_DELAY,
            },
            "note": "น้ำหนักต่างกัน → GA ค้นเจอ chromosome ที่โปรไฟล์ต่างกัน",
        },
        "configurations": results,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n  บันทึก: {OUTPUT_FILE}")
    print("=" * 90)


if __name__ == "__main__":
    main()
