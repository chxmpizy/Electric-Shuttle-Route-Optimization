"""Main entry point for TU Route Optimization."""
import argparse
import sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.ACO import run_aco
from algorithms.GA import run_ga
from algorithms.PSO import run_pso
from algorithms.SA import run_sa
from config.settings import DEFAULT_TRIALS, GENERATIONS
from optimization.evaluator import evaluate
from pipeline import setup_environment
from visualization.comparison import compare_result, plot_algorithm_history

def baseline_score(fixed_routes: list[dict], ctx, trials: int = 10) -> float:
    """Evaluate the existing schedule with the same objective as every algorithm."""
    return evaluate(fixed_routes, ctx, runs=trials)

def run_experiment(algorithm: str, trials: int, generations: int, plot: bool = True) -> tuple:
    graph, fixed_routes, stops, ctx = setup_environment()
    print("Running baseline simulation...")
    before = baseline_score(fixed_routes, ctx, trials=min(trials, 10))
    print(f"Baseline score: {round(before, 3)}")
    all_scores = []
    best_score = float("inf")
    best_solution = None
    best_history = None

    for trial in range(trials):
        print(f"\n--- Trial {trial + 1}/{trials} [{algorithm.upper()}] ---")
        if algorithm == "ga":
            solution, score, history = run_ga(ctx, generations=generations)
        elif algorithm == "sa":
            solution, score, history = run_sa(ctx)
        elif algorithm == "pso":
            solution, score, history = run_pso(fixed_routes, ctx)
        elif algorithm == "aco":
            solution, score, history = run_aco(ctx)
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")
            
        all_scores.append(score)
        if score < best_score:
            best_score = score
            best_solution = solution
            best_history = history

    avg_score = round(sum(all_scores) / len(all_scores), 3)
    print(f"\nAvg {algorithm.upper()} Score: {avg_score}")
    print(f"Std {algorithm.upper()} Score: {round(float(np.std(all_scores)), 3)}")
    print(f"Best {algorithm.upper()} Score: {round(best_score, 3)}")
    
    if plot:
        compare_result(before, avg_score)
        if best_history:
            plot_algorithm_history({algorithm.upper(): best_history, "BASELINE": [before]*len(best_history)})
        
    return best_solution, best_score, best_history, before

def main() -> None:
    parser = argparse.ArgumentParser(description="TU Route Optimization")
    parser.add_argument(
        "--algorithm",
        choices=["ga", "sa", "pso", "aco", "all"],
        default="ga",
        help="Optimization algorithm to run",
    )
    parser.add_argument("--trials", type=int, default=DEFAULT_TRIALS, help="Number of experiment trials")
    parser.add_argument("--generations", type=int, default=GENERATIONS, help="GA generations")
    args = parser.parse_args()

    if args.algorithm == "all":
        all_histories = {}
        baseline_val = None
        for algo in ("ga", "sa", "pso", "aco"):
            _, _, history, before = run_experiment(algo, trials=args.trials, generations=args.generations, plot=False)
            if history:
                all_histories[algo.upper()] = history
            baseline_val = before
        
        if all_histories and baseline_val is not None:
            # Find max length to make the baseline line span the whole graph
            max_len = max(len(h) for h in all_histories.values())
            all_histories["BASELINE"] = [baseline_val] * max_len
            
            print("\nPlotting combined histories for all algorithms...")
            plot_algorithm_history(all_histories, title="Comparison of All Metaheuristic Algorithms vs Baseline")
    else:
        run_experiment(args.algorithm, trials=args.trials, generations=args.generations)

if __name__ == "__main__":
    main()
