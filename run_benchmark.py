import sys
import json
import statistics
from pathlib import Path
from collections import defaultdict

# Add src to python path
sys.path.insert(0, str(Path("src").resolve()))

from pipeline import setup_environment
from run_sim import get_simulation_metrics
from algorithms.GA import run_ga
from algorithms.SA import run_sa
from algorithms.PSO import run_pso
from algorithms.ACO import run_aco

def main():
    print("Initializing environment...")
    graph, fixed_routes, stops, ctx = setup_environment()
    
    # Run baseline once
    base_metrics, base_schedule = get_simulation_metrics(fixed_routes, ctx)
    print(f"Baseline: Wait={base_metrics['avg_wait_time']:.2f}, Travel={base_metrics['avg_travel_time']:.2f}")

    algorithms = ['ga', 'sa', 'pso', 'aco']
    num_runs = 20
    
    results = defaultdict(lambda: {'wait': [], 'travel': [], 'best_wait': float('inf'), 'best_schedule': None})
    
    for algo in algorithms:
        print(f"\n--- Running {algo.upper()} for {num_runs} iterations ---")
        for i in range(num_runs):
            print(f"Iteration {i+1}/{num_runs}...", end=" ", flush=True)
            if algo == "ga":
                solution, _, _ = run_ga(ctx, generations=10)
            elif algo == "sa":
                solution, _, _ = run_sa(ctx)
            elif algo == "pso":
                solution, _, _ = run_pso(fixed_routes, ctx)
            elif algo == "aco":
                solution, _, _ = run_aco(ctx, iterations=20, num_ants=10)
                
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
            wait = opt_metrics["avg_wait_time"]
            travel = opt_metrics["avg_travel_time"]
            print(f"Wait={wait:.2f}, Travel={travel:.2f}")
            
            results[algo]['wait'].append(wait)
            results[algo]['travel'].append(travel)
            
            # Save the best schedule based on lowest wait time (or combined penalty)
            # We'll use wait_time + travel_time as a simple score
            score = wait + travel
            best_score = results[algo].get('best_score', float('inf'))
            if score < best_score:
                results[algo]['best_score'] = score
                results[algo]['best_wait'] = wait
                results[algo]['best_travel'] = travel
                results[algo]['best_schedule'] = final_schedule

    # Summarize
    summary = {
        "baseline": {
            "wait": base_metrics['avg_wait_time'],
            "travel": base_metrics['avg_travel_time']
        },
        "algorithms": {}
    }
    
    for algo in algorithms:
        summary["algorithms"][algo] = {
            "avg_wait": statistics.mean(results[algo]['wait']),
            "min_wait": min(results[algo]['wait']),
            "avg_travel": statistics.mean(results[algo]['travel']),
            "min_travel": min(results[algo]['travel']),
            "best_run_wait": results[algo]['best_wait'],
            "best_run_travel": results[algo]['best_travel'],
            "best_schedule": results[algo]['best_schedule']
        }
        
    with open("benchmark_results.json", "w") as f:
        json.dump(summary, f, indent=4)
        
    print("\nBenchmark completed and saved to benchmark_results.json")

if __name__ == "__main__":
    main()
