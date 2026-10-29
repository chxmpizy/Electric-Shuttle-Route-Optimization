"""summarize_v2.py — ตารางเทียบ v1 (CS pilot 400) vs v2 (full CS)
และสรุป Pareto จาก fleet_reduction_result.json
"""
import json
from pathlib import Path


def _load(path):
    p = Path(path)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def _row(algo, r, best_seed=None):
    if "seeds" in r and r["seeds"]:
        best = min(r["seeds"], key=lambda x: x["score"])
        return (
            algo,
            r.get("best_score", best["score"]),
            r.get("mean_score", best["score"]),
            r.get("mean_on_time_pct", best.get("on_time_pct", 0)),
            best.get("stranded", 0),
            best.get("avg_delay", 0),
            best.get("total_buses", 0),
        )
    return (algo, r["score"], r["score"], r["on_time_pct"],
            r["stranded"], r["avg_delay"], r["total_buses"])


def _print_table(title, data):
    print(f"\n{'='*78}")
    print(f"  {title}")
    print(f"{'='*78}")
    print(f"{'Algo':<10} {'Best':<10} {'Mean':<10} {'On-Time%':<10} "
          f"{'Stranded':<10} {'Delay(m)':<10} {'Buses':<7}")
    print("-" * 78)
    for algo, best, mean, ot, stranded, delay, buses in data:
        print(f"{algo:<10} {best:<10.4f} {mean:<10.4f} {ot:<10.1f} "
              f"{stranded:<10} {delay:<10.1f} {buses:<7}")


def summarize_benchmark(path, title):
    data = _load(path)
    if not data:
        print(f"[miss] {path}")
        return
    rows = []
    rows.append(_row("Baseline", data["results"]["baseline"]))
    for algo in ("GA", "SA", "PSO", "ACO"):
        if algo in data["results"]:
            rows.append(_row(algo, data["results"][algo]))
    meta = data.get("metadata", {})
    _print_table(f"{title} — demand={meta.get('total_passengers','?')} "
                 f"sim={meta.get('sim_window_min','?')}m", rows)


def summarize_pareto(path="fleet_reduction_result.json"):
    data = _load(path)
    if not data:
        print(f"\n[miss] {path} (run fleet_reduction.py first)")
        return
    print(f"\n{'='*78}")
    print(f"  Fleet Reduction Pareto — demand="
          f"{data['metadata']['total_passengers']}")
    print(f"{'='*78}")
    print(f"{'Cap':<5} {'Used':<5} {'Score':<10} {'On-Time%':<10} "
          f"{'Stranded':<10} {'Delay(m)':<10} {'Wait(m)':<10}")
    print("-" * 78)
    for c in data["pareto"]:
        b = c["best_run"]
        print(f"{c['fleet_cap']:<5} {b['total_buses']:<5} {b['score']:<10.4f} "
              f"{c['mean_on_time_pct']:<10.1f} {b['stranded']:<10} "
              f"{b['avg_delay']:<10.1f} {b['avg_wait']:<10.1f}")


if __name__ == "__main__":
    summarize_benchmark("cs_benchmark_result.json",
                        "v1 — Pilot (old weights 0.20/0.15/0.35)")
    summarize_benchmark("cs_benchmark_result_v2.json",
                        "v2 — Full CS (new weights 0.30/0.00/0.70)")
    summarize_pareto()
