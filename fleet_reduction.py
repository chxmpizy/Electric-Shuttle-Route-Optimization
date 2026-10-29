"""fleet_reduction.py — Pareto trade-off ระหว่างจำนวนรถกับคุณภาพบริการ

ทดลองลด total_buses ลงไล่ 20, 18, 16, 14, 12, 10, 8 คัน
รัน GA แต่ละ config → บันทึก on-time %, delay, wait, stranded
Output: fleet_reduction_result.json (ไฟล์เดียวจบ)
"""
import sys, os, time, json, random, platform
sys.path.insert(0, "src")

from data.timetable import load_cs_periods_csv, summarize_demands
from data.graph import build_graph, make_bidirectional
from data.routes import build_fixed_routes, get_all_stops, HUB_STOPS
from optimization.context import RouteContext
from optimization.fitness import fitness, fitness_breakdown
from simulation.engine import run_simulation
from algorithms.GA import run_ga

FLEET_CONFIGS = [20, 18, 16, 14, 12, 10, 8]
SEEDS = [42, 123]
GA_GENS = 10
DEMAND_DAYS = ["อังคาร", "พฤหัสบดี"]
OUTPUT_FILE = "fleet_reduction_result.json"

print("=" * 70)
print("  Fleet Reduction Pareto Experiment")
print(f"  Fleet caps: {FLEET_CONFIGS} | Seeds: {SEEDS} | GA gens: {GA_GENS}")
print("=" * 70)

graph = make_bidirectional(build_graph())
stops = get_all_stops()
fixed_routes = build_fixed_routes(graph)
demands = load_cs_periods_csv(day_filter=DEMAND_DAYS, graph=graph)
stats = summarize_demands(demands)
max_t = max(int(d.class_start_time) + 60 for d in demands)
sim_time = max(max_t, 900)
print(f"\nDemand: {stats['total_passengers']:,} | Sim window: {sim_time} min")


def eval_full(chromosome):
    active = [{"path": g["path"], "num_bus": g["num_bus"],
               "cycle_time": g["cycle_time"], "headway": g["headway"],
               "startTime": g["startTime"], "endTime": g["endTime"]}
              for g in chromosome]
    total_buses = sum(g["num_bus"] for g in chromosome)
    result = run_simulation(active_routes=active, stops=stops,
                            simulation_time=sim_time,
                            passenger_demands=demands, graph=graph, seed=42)
    score = fitness(result, total_buses=total_buses)
    return {
        "score": score, "total_buses": total_buses,
        "avg_wait": result["avg_wait_time"],
        "avg_travel": result["avg_travel_time"],
        "avg_delay": result["avg_delay_minutes"],
        "on_time_pct": result["on_time_rate_pct"],
        "served": result["served_passengers"],
        "stranded": result["stranded_passengers"],
        "late": result["late_passengers"],
    }


configs_result = []
for cap in FLEET_CONFIGS:
    print(f"\n── Fleet cap = {cap} buses ──")
    ctx = RouteContext(
        graph=graph, stops=stops, hub_stops=HUB_STOPS,
        num_routes=len(fixed_routes), min_per_route=1, max_per_route=8,
        total_buses=cap, start_time=420, end_time=sim_time,
        passenger_demands=demands, eval_seed=42,
    )

    seed_runs = []
    for s in SEEDS:
        random.seed(s)
        t0 = time.time()
        solution, score, history = run_ga(ctx, generations=GA_GENS)
        elapsed = time.time() - t0
        full = eval_full(solution)
        seed_runs.append({"seed": s, "elapsed_sec": round(elapsed, 2), **full})
        print(f"  Seed={s} | Buses used={full['total_buses']:<3} "
              f"| On-time={full['on_time_pct']:.1f}% "
              f"| Stranded={full['stranded']:<4} "
              f"| Delay={full['avg_delay']:.1f}m | {elapsed:.1f}s")

    best = min(seed_runs, key=lambda r: r["score"])
    mean_on_time = sum(r["on_time_pct"] for r in seed_runs) / len(seed_runs)
    configs_result.append({
        "fleet_cap": cap,
        "best_run": best,
        "mean_on_time_pct": round(mean_on_time, 2),
        "all_seeds": seed_runs,
    })

print("\n" + "=" * 70)
print("  📊 PARETO SUMMARY")
print("=" * 70)
print(f"{'Cap':<5} {'Used':<5} {'On-time%':<10} {'Stranded':<10} {'Delay(m)':<10} {'Wait(m)':<10}")
print("-" * 70)
for c in configs_result:
    b = c["best_run"]
    print(f"{c['fleet_cap']:<5} {b['total_buses']:<5} {c['mean_on_time_pct']:<10.1f} "
          f"{b['stranded']:<10} {b['avg_delay']:<10.1f} {b['avg_wait']:<10.1f}")

output = {
    "metadata": {
        "experiment": "fleet_reduction_pareto",
        "fleet_configs": FLEET_CONFIGS,
        "seeds": SEEDS,
        "ga_generations": GA_GENS,
        "demand_days": DEMAND_DAYS,
        "total_passengers": stats["total_passengers"],
        "sim_window_min": sim_time,
        "fitness_weights": {"W_WAIT": 0.30, "W_TRAVEL": 0.00, "W_DELAY": 0.70,
                            "PENALTY_UNSERVED": 60.0, "FLEET_COST": 0.0},
        "hardware": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "cpu_count": os.cpu_count(),
        },
    },
    "pareto": configs_result,
}
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"\nSaved: {OUTPUT_FILE}")
