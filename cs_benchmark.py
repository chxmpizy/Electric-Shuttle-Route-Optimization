"""
cs_benchmark.py
================
เปรียบเทียบ Baseline, GA, SA, PSO, ACO บนข้อมูลตารางเรียน CS จริง

เงื่อนไขการเปรียบเทียบที่เป็นธรรม (Fair Benchmark):
  - Demand set เดียวกัน (ตารางเรียน CS, อังคาร+พฤหัส)
  - Simulation window เดียวกัน
  - ประเมินผลบน fitness function เดียวกัน
  - บันทึก: เวลาประมวลผล, ประวัติคะแนน, ผลทัน/สาย/ตกค้าง

อ้างอิง: Díaz-Ramírez et al. (2022), Section 5.2 — "Computational experiments"
         ใช้ Shifted Geometric Mean ของ objective ratio เปรียบเทียบวิธีต่างๆ

รัน: python cs_benchmark.py
"""
import sys, os, time, json, random, copy, platform, statistics
sys.path.insert(0, "src")

from pathlib import Path
from data.timetable import load_cs_periods_csv, summarize_demands
from data.graph import (build_graph, make_bidirectional,
                        MAX_SPEED_KMH, ACCEL_MS2, DECEL_MS2, TRAFFIC_LIGHT)
from data.routes import build_fixed_routes, get_all_stops, HUB_STOPS
from optimization.context import RouteContext
from optimization.fitness import fitness, fitness_breakdown
from optimization.evaluator import evaluate
from optimization.chromosome import enforce_fleet_limit
from simulation.engine import run_simulation

# Algorithms
from algorithms.GA import run_ga
from algorithms.SA import run_sa
from algorithms.PSO import run_pso
from algorithms.ACO import run_aco

# ─── Config ──────────────────────────────────────────────────────────────────
SEEDS = [42, 123, 456, 789, 1011, 1213, 1415, 1617, 1819, 2021]  # 10 seeds → รันแต่ละ algorithm 10 รอบ
GA_GENS = 15
SA_ITERS = 200
PSO_ITERS = 30
ACO_ITERS = 20

OUTPUT_FILE = "cs_benchmark_result_v3.json"
DEMAND_DAYS = ["อังคาร", "พฤหัสบดี"]
DEMAND_TERMS = [1]             # ใช้เทอมเดียว — เทอม 1 กับ 2 ไม่ได้เรียนพร้อมกัน
STUDENTS_PER_YEAR = 70         # นักศึกษาต่อชั้นปี (ต่อภาค ปกติ/พิเศษ)

print("=" * 90)
print("  UniFlow EV — CS Department Algorithm Benchmark")
print("  อ้างอิงวิธีเปรียบเทียบ: Díaz-Ramírez et al. (2022)")
print("=" * 90)

# ─── 1. เตรียมสภาพแวดล้อม ──────────────────────────────────────────────────
print("\n[1] เตรียม Graph + Routes + Demand ...")
graph = make_bidirectional(build_graph())
stops = get_all_stops()
fixed_routes = build_fixed_routes(graph)

demands = load_cs_periods_csv(
    normal_csv="data/processed/CS/normal/periods.csv",
    special_csv="data/processed/CS/special/periods.csv",
    day_filter=DEMAND_DAYS,
    term_filter=DEMAND_TERMS,
    graph=graph,
    students_per_year=STUDENTS_PER_YEAR,
)
stats = summarize_demands(demands)
max_t = max(int(d.class_start_time) + 60 for d in demands)
sim_time = max(max_t, 900)

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
    # Feedback #7: ให้ลูปค้นหาเห็น demand จริงเหมือนตอน eval สุดท้าย (fair comparison)
    passenger_demands=demands,
    eval_seed=42,
)

print(f"  ผู้โดยสาร CS : {stats['total_passengers']:,} คน "
      f"(จำกัด {stats['limited_course_passengers']} + ทั่วไป {stats['general_course_passengers']})")
print(f"  Sim window   : {sim_time} นาที ({sim_time/60:.1f} ชม.)")
print(f"  Seeds        : {SEEDS}")

# ─── Helper: รัน simulation บน chromosome แล้วดึงสถิติ ──────────────────────
def eval_full(chromosome: list[dict]) -> dict:
    """ประเมิน chromosome และคืนผลลัพธ์ละเอียด"""
    enforce_fleet_limit(chromosome, ctx)
    active = [{
        "path": g["path"], "num_bus": g["num_bus"],
        "cycle_time": g["cycle_time"], "headway": g["headway"],
        "startTime": g["startTime"], "endTime": g["endTime"],
    } for g in chromosome]
    total_buses = sum(g["num_bus"] for g in chromosome)
    result = run_simulation(
        active_routes=active, stops=stops,
        simulation_time=sim_time,
        passenger_demands=demands, graph=graph, seed=42,
    )
    # ใช้ evaluate() เดียวกับตอนค้นหา (fitness + structural penalties) ให้คะแนนเทียบกันได้ตรง ๆ
    score = evaluate(chromosome, ctx)
    bd = fitness_breakdown(result, total_buses=total_buses)
    bus_stats = result.get("bus_stats", [])
    fleet_util = result.get("fleet_utilization_pct", 0.0)
    utilizations = [b["utilization_pct"] for b in bus_stats]
    return {
        "score": score,
        "total_buses": total_buses,
        "avg_wait": result["avg_wait_time"],
        "avg_travel": result["avg_travel_time"],
        "avg_delay": result["avg_delay_minutes"],
        "on_time_pct": result["on_time_rate_pct"],
        "served": result["served_passengers"],
        "stranded": result["stranded_passengers"],
        "late": result["late_passengers"],
        "case_on_time": result["case_on_time"],
        "case_missed": result["case_missed"],
        "case_bus_full": result["case_bus_full"],
        "breakdown": bd,
        # Feedback #6: per-bus utilization
        "fleet_utilization_pct": fleet_util,
        "min_bus_util_pct": round(min(utilizations), 2) if utilizations else 0.0,
        "max_bus_util_pct": round(max(utilizations), 2) if utilizations else 0.0,
        "bus_stats": bus_stats,
    }

# ─── 2. Baseline ─────────────────────────────────────────────────────────────
print("\n[2] Baseline ...")
baseline_chromosome = []
for r in fixed_routes:
    baseline_chromosome.append({
        "path": r["path"], "num_bus": r.get("num_bus", 5),
        "cycle_time": r.get("cycle_time", 60), "headway": r.get("headway", 12),
        "startTime": 420, "endTime": sim_time,
    })
t0 = time.time()
baseline_res = eval_full(baseline_chromosome)
baseline_time = time.time() - t0
print(f"  Score={baseline_res['score']:.4f} | On-time={baseline_res['on_time_pct']:.1f}% "
      f"| Served={baseline_res['served']} | Stranded={baseline_res['stranded']} "
      f"| Delay={baseline_res['avg_delay']:.1f}m | ({baseline_time:.1f}s)")

results = {"baseline": {**baseline_res, "time_sec": round(baseline_time, 2),
                        "seeds": [], "history": []}}

# ─── 3. Multi-seed benchmark สำหรับแต่ละ algorithm ─────────────────────────
algo_configs = [
    ("GA",  lambda seed: run_ga(ctx, generations=GA_GENS)),
    ("SA",  lambda seed: run_sa(ctx, max_iter=SA_ITERS)),
    ("PSO", lambda seed: run_pso(fixed_routes, ctx, max_iter=PSO_ITERS)),
    ("ACO", lambda seed: run_aco(ctx, iterations=ACO_ITERS, num_ants=10)),
]

print(f"\n[3] Algorithm Benchmark ({len(SEEDS)} seeds each) ...")
for algo_name, runner in algo_configs:
    print(f"\n  ── {algo_name} ──────────────────────────")
    seed_results = []
    all_histories = []

    for s in SEEDS:
        random.seed(s)
        t0 = time.time()
        solution, score, history = runner(s)
        elapsed = time.time() - t0
        full_res = eval_full(solution)
        seed_results.append({
            "seed": s,
            "elapsed_sec": round(elapsed, 2),
            "score": full_res["score"],
            "on_time_pct": full_res["on_time_pct"],
            "served": full_res["served"],
            "stranded": full_res["stranded"],
            "late": full_res["late"],
            "case_on_time": full_res["case_on_time"],
            "case_missed": full_res["case_missed"],
            "case_bus_full": full_res["case_bus_full"],
            "avg_wait": full_res["avg_wait"],
            "avg_travel": full_res["avg_travel"],
            "avg_delay": full_res["avg_delay"],
            "total_buses": full_res["total_buses"],
            # Feedback #6: utilization
            "fleet_utilization_pct": full_res["fleet_utilization_pct"],
            "min_bus_util_pct": full_res["min_bus_util_pct"],
            "max_bus_util_pct": full_res["max_bus_util_pct"],
        })
        all_histories.append(history)
        print(f"    Seed={s} | Score={full_res['score']:.4f} "
              f"| On-time={full_res['on_time_pct']:.1f}% "
              f"| Missed={full_res['case_missed']} BusFull={full_res['case_bus_full']} "
              f"| Delay={full_res['avg_delay']:.1f}m "
              f"| {elapsed:.1f}s")

    scores = [r["score"] for r in seed_results]
    on_times = [r["on_time_pct"] for r in seed_results]
    results[algo_name] = {
        "seeds": seed_results,
        "history": all_histories,
        "mean_score": round(sum(scores)/len(scores), 4),
        "best_score": round(min(scores), 4),
        "worst_score": round(max(scores), 4),
        "mean_on_time_pct": round(sum(on_times)/len(on_times), 2),
        "std_score": round(statistics.stdev(scores), 4) if len(scores) > 1 else 0.0,
        "std_on_time_pct": round(statistics.stdev(on_times), 2) if len(on_times) > 1 else 0.0,
    }
    print(f"    → Mean={results[algo_name]['mean_score']:.4f} "
          f"Best={results[algo_name]['best_score']:.4f} "
          f"Worst={results[algo_name]['worst_score']:.4f} "
          f"Mean On-Time={results[algo_name]['mean_on_time_pct']:.1f}%")

# ─── 4. สรุปตารางเปรียบเทียบ ─────────────────────────────────────────────────
print("\n" + "=" * 70)
print("  SUMMARY TABLE")
print("=" * 90)
header = (f"{'Algorithm':<10} {'Score(best)':<13} {'Score(mean)':<13} {'On-Time%':<10} "
          f"{'Missed':<8} {'BusFull':<8} {'Stranded':<10} {'Delay(m)':<10} {'Buses':<7}")
print(header)
print("-" * 90)

# Baseline
b = results["baseline"]
print(f"{'Baseline':<10} {b['score']:<13.4f} {b['score']:<13.4f} "
      f"{b['on_time_pct']:<10.1f} {b['case_missed']:<8} {b['case_bus_full']:<8} {b['stranded']:<10} "
      f"{b['avg_delay']:<10.1f} {b['total_buses']:<7}")

for algo in ["GA", "SA", "PSO", "ACO"]:
    r = results[algo]
    best_seed = min(r["seeds"], key=lambda x: x["score"])
    print(f"{algo:<10} {r['best_score']:<13.4f} {r['mean_score']:<13.4f} "
          f"{r['mean_on_time_pct']:<10.1f} {best_seed['case_missed']:<8} "
          f"{best_seed['case_bus_full']:<8} {best_seed['stranded']:<10} "
          f"{best_seed['avg_delay']:<10.1f} {best_seed['total_buses']:<7}")

# ─── 5. บันทึกผล ─────────────────────────────────────────────────────────────
output = {
    "metadata": {
        "dataset": (f"CS Department Timetable — normal+special, days={DEMAND_DAYS}, "
                    f"terms={DEMAND_TERMS}, all years, {STUDENTS_PER_YEAR} students/year"),
        "source_csv": {
            "normal": "data/processed/CS/normal/periods.csv",
            "special": "data/processed/CS/special/periods.csv",
        },
        "fitness_weights": {"W_MISSED": 40.0, "W_BUS_FULL": 60.0, "W_WAIT": 0.30,
                            "W_TRAVEL": 0.00, "W_DELAY": 0.70, "FLEET_COST": 0.0},
        "total_passengers": stats["total_passengers"],
        "students_per_year": STUDENTS_PER_YEAR,
        "terms": DEMAND_TERMS,
        "travel_time_model": {"max_speed_kmh": MAX_SPEED_KMH, "accel_ms2": ACCEL_MS2,
                              "decel_ms2": DECEL_MS2, "traffic_light": TRAFFIC_LIGHT},
        "sim_window_min": sim_time,
        "seeds": SEEDS,
        "reference": "Díaz-Ramírez et al. (2022) doi:10.1016/j.cie.2022.108101",
        # Feedback #7: บันทึก parameter + hardware ให้เปรียบเทียบย้อนกลับได้
        "algo_params": {
            "GA":  {"generations": GA_GENS},
            "SA":  {"max_iter": SA_ITERS},
            "PSO": {"max_iter": PSO_ITERS},
            "ACO": {"iterations": ACO_ITERS, "num_ants": 10},
        },
        "hardware": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "cpu_count": os.cpu_count(),
            "parallelism": "sequential (1 thread per algorithm run)",
        },
        "demand_mode": "fixed-demand (ctx.passenger_demands) during search AND final eval",
    },
    "demand_stats": stats,
    "results": results,
}
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"\n  บันทึกผลทั้งหมดไว้ที่: {OUTPUT_FILE}")
print("=" * 90)
