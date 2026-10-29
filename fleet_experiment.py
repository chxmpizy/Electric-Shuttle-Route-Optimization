"""
fleet_experiment.py
===================
การทดลองลดจำนวนรถ (Fleet Sizing Trade-off) — Roadmap Phase 5

คำถาม: ถ้าลดจำนวนรถลง ระดับบริการ (On-time %, เวลารอ, คนตกค้าง) แย่ลงแค่ไหน
และจุดสมดุลที่คุ้มค่าอยู่ตรงไหน

วิธีทดลอง:
  - Demand ชุดเดียวกับ cs_benchmark.py (ตารางเรียน CS อังคาร+พฤหัส)
  - เพดานจำนวนรถ N ∈ FLEET_CAPS (ขั้นต่ำ 6 = 1 คันต่อ 6 เส้นทาง)
  - Optimized : SA (ค่าเฉลี่ยดีที่สุดใน cs_benchmark) budget 500 evaluations × 5 seeds
                ถ้าผลลัพธ์เกินเพดาน จะตัดรถออกจากเส้นทางที่มีรถมากสุดจนไม่เกิน N
  - Baseline  : 6 เส้นทางเดิม (fixed routes) กระจายรถ N คันเท่าๆ กัน

ผลลัพธ์: fleet_experiment_result.json + fleet_tradeoff.png

รัน: python fleet_experiment.py
"""
import sys, json, random, statistics
sys.path.insert(0, "src")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from data.timetable import load_cs_timetable
from data.graph import build_graph, make_bidirectional, calculate_cycle_time
from data.routes import build_fixed_routes, get_all_stops, HUB_STOPS
from optimization.context import RouteContext
from optimization.fitness import fitness
from optimization.evaluator import reset_eval_count, get_eval_count
from simulation.engine import run_simulation
from algorithms.SA import run_sa

# ─── Config ──────────────────────────────────────────────────────────────────
FLEET_CAPS = [30, 24, 20, 18, 16, 14, 12, 10, 8, 6]
SEEDS = [42, 123, 456, 789, 999]
EVAL_BUDGET = 500
SA_ITERS = EVAL_BUDGET - 1
SA_T_INIT = 100.0
SA_COOLING = (0.001 / SA_T_INIT) ** (1 / (SA_ITERS + 1))

OUTPUT_FILE = "fleet_experiment_result.json"
PLOT_FILE = "fleet_tradeoff.png"

# ─── Setup (เหมือน cs_benchmark.py) ──────────────────────────────────────────
graph = make_bidirectional(build_graph())
stops = get_all_stops()
fixed_routes = build_fixed_routes(graph)
demands = load_cs_timetable(
    xlsx_path="data/raw/cs_timetable.xlsx",
    day_filter=["อังคาร", "พฤหัสบดี"],
    graph=graph,
    limited_section_size=50,
    general_section_size=120,
)
sim_time = max(max(int(d.class_start_time) + 60 for d in demands), 900)
MIN_PER_ROUTE = 1


def simulate(chromosome: list[dict]) -> dict:
    active = [{
        "path": g["path"], "num_bus": g["num_bus"],
        "cycle_time": g["cycle_time"], "headway": g["headway"],
        "startTime": g["startTime"], "endTime": g["endTime"],
    } for g in chromosome]
    total_buses = sum(g["num_bus"] for g in chromosome)
    r = run_simulation(active_routes=active, stops=stops, simulation_time=sim_time,
                       passenger_demands=demands, graph=graph, seed=42)
    return {
        "score": fitness(r, total_buses=total_buses),
        "total_buses": total_buses,
        "on_time_pct": r["on_time_rate_pct"],
        "avg_wait": r["avg_wait_time"],
        "avg_travel": r["avg_travel_time"],
        "avg_delay": r["avg_delay_minutes"],
        "stranded": r["stranded_passengers"],
        "late": r["late_passengers"],
    }


def enforce_cap(chromosome: list[dict], cap: int) -> tuple[list[dict], bool]:
    """ตัดรถออกจากเส้นทางที่มีรถมากที่สุดทีละคันจนรวมไม่เกิน cap"""
    sol = [dict(g) for g in chromosome]
    trimmed = False
    while sum(g["num_bus"] for g in sol) > cap:
        g = max(sol, key=lambda x: x["num_bus"])
        if g["num_bus"] <= MIN_PER_ROUTE:
            break
        g["num_bus"] -= 1
        g["headway"] = round(g["cycle_time"] / g["num_bus"], 2)
        trimmed = True
    return sol, trimmed


def baseline_with_fleet(cap: int) -> list[dict]:
    """6 เส้นทางเดิม กระจายรถ cap คันให้เท่าๆ กัน (เศษให้เส้นทางแรกๆ)"""
    n = len(fixed_routes)
    sol = []
    for i, r in enumerate(fixed_routes):
        num_bus = cap // n + (1 if i < cap % n else 0)
        cycle = calculate_cycle_time(r["path"], graph)
        sol.append({
            "path": r["path"], "num_bus": num_bus, "cycle_time": cycle,
            "headway": round(cycle / num_bus, 2), "startTime": 420, "endTime": sim_time,
        })
    return sol


def mean_std(values: list[float]) -> tuple[float, float]:
    return (round(statistics.mean(values), 2),
            round(statistics.stdev(values), 2) if len(values) > 1 else 0.0)


print("=" * 70)
print("  UniFlow EV — Fleet Sizing Trade-off (SA vs Baseline)")
print("=" * 70)

rows = []
for cap in FLEET_CAPS:
    base = simulate(baseline_with_fleet(cap))

    runs = []
    for s in SEEDS:
        ctx = RouteContext(
            graph=graph, stops=stops, hub_stops=HUB_STOPS,
            num_routes=len(fixed_routes), min_per_route=MIN_PER_ROUTE,
            max_per_route=min(8, cap), total_buses=cap,
            start_time=420, end_time=sim_time,
            passenger_demands=demands, eval_seed=42,
        )
        random.seed(s)
        reset_eval_count()
        solution, _, _ = run_sa(ctx, max_iter=SA_ITERS, t_init=SA_T_INIT, cooling_rate=SA_COOLING)
        n_evals = get_eval_count()
        solution, trimmed = enforce_cap(solution, cap)
        res = simulate(solution)
        runs.append({"seed": s, "n_evals": n_evals, "trimmed_to_cap": trimmed, **res})

    on_time_m, on_time_s = mean_std([r["on_time_pct"] for r in runs])
    wait_m, wait_s = mean_std([r["avg_wait"] for r in runs])
    delay_m, delay_s = mean_std([r["avg_delay"] for r in runs])
    score_m, score_s = mean_std([r["score"] for r in runs])
    best = min(runs, key=lambda r: r["score"])
    row = {
        "fleet_cap": cap,
        "baseline": base,
        "sa": {
            "mean_score": score_m, "std_score": score_s,
            "mean_on_time_pct": on_time_m, "std_on_time_pct": on_time_s,
            "best_on_time_pct": max(r["on_time_pct"] for r in runs),
            "mean_avg_wait": wait_m, "std_avg_wait": wait_s,
            "mean_avg_delay": delay_m, "std_avg_delay": delay_s,
            "max_stranded": max(r["stranded"] for r in runs),
            "mean_buses_used": round(statistics.mean(r["total_buses"] for r in runs), 1),
            "best_run": best,
            "runs": runs,
        },
    }
    rows.append(row)
    print(f"  N={cap:>2} | Baseline on-time={base['on_time_pct']:5.1f}% wait={base['avg_wait']:5.1f}m "
          f"| SA on-time={on_time_m:5.1f}% (±{on_time_s:4.1f}) best={row['sa']['best_on_time_pct']:5.1f}% "
          f"wait={wait_m:5.1f}m buses≈{row['sa']['mean_buses_used']}")

# ─── Plot trade-off ──────────────────────────────────────────────────────────
caps = [r["fleet_cap"] for r in rows]
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.5))

ax1.plot(caps, [r["baseline"]["on_time_pct"] for r in rows], "o--", color="#888888", label="Baseline (fixed routes)")
ax1.errorbar(caps, [r["sa"]["mean_on_time_pct"] for r in rows],
             yerr=[r["sa"]["std_on_time_pct"] for r in rows],
             fmt="o-", color="#1f77b4", capsize=3, label="SA mean ± std (5 seeds)")
ax1.plot(caps, [r["sa"]["best_on_time_pct"] for r in rows], "^:", color="#1f77b4", alpha=0.6, label="SA best")
ax1.set_xlabel("Fleet size cap (buses)")
ax1.set_ylabel("On-time arrival rate (%)")
ax1.set_title("On-time rate vs fleet size")
ax1.invert_xaxis()
ax1.grid(alpha=0.3)
ax1.legend()

ax2.plot(caps, [r["baseline"]["avg_wait"] for r in rows], "o--", color="#888888", label="Baseline (fixed routes)")
ax2.errorbar(caps, [r["sa"]["mean_avg_wait"] for r in rows],
             yerr=[r["sa"]["std_avg_wait"] for r in rows],
             fmt="o-", color="#d62728", capsize=3, label="SA mean ± std (5 seeds)")
ax2.set_xlabel("Fleet size cap (buses)")
ax2.set_ylabel("Average waiting time (min)")
ax2.set_title("Waiting time vs fleet size")
ax2.invert_xaxis()
ax2.grid(alpha=0.3)
ax2.legend()

fig.suptitle("Fleet Sizing Trade-off — CS timetable demand (Tue+Thu)")
fig.tight_layout()
fig.savefig(PLOT_FILE, dpi=150)

output = {
    "metadata": {
        "dataset": "CS Department Timetable (อังคาร+พฤหัส)",
        "total_passengers": len(demands),
        "sim_window_min": sim_time,
        "fleet_caps": FLEET_CAPS,
        "seeds": SEEDS,
        "algorithm": "SA",
        "eval_budget": EVAL_BUDGET,
        "sa_params": {"max_iter": SA_ITERS, "t_init": SA_T_INIT, "cooling_rate": round(SA_COOLING, 6)},
        "baseline": "6 fixed routes, buses split evenly",
        "cap_enforcement": "soft penalty during search + trim to cap after search",
    },
    "results": rows,
}
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"\n  บันทึกผลไว้ที่: {OUTPUT_FILE}, {PLOT_FILE}")
