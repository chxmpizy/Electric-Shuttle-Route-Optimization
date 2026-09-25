import argparse
import sys
import json
import subprocess
from pathlib import Path

# Add src to python path
sys.path.insert(0, str(Path("src").resolve()))

from pipeline import setup_environment
from simulation.engine import run_simulation
from algorithms.GA import run_ga
from algorithms.SA import run_sa
from algorithms.PSO import run_pso
from algorithms.ACO import run_aco

def get_simulation_metrics(chromosome, ctx):
    """Run simulation directly and return raw metrics."""
    # Handle both Chromosome objects and direct list[dict]
    if hasattr(chromosome, "schedule"):
        schedule = chromosome.schedule
    else:
        schedule = chromosome
        
    active_routes = [
        {
            "path": gene["path"],
            "num_bus": gene["num_bus"],
            "cycle_time": gene["cycle_time"],
            "headway": gene["headway"],
            "startTime": gene["startTime"],
            "endTime": gene["endTime"],
        }
        for gene in schedule
    ]
    simulation_time = max(gene["endTime"] for gene in schedule)
    return run_simulation(active_routes, ctx.stops, simulation_time), schedule

def print_comparison(base_metrics, opt_metrics, algo_name):
    print("\n" + "="*50)
    print(f"🌟 COMPARISON REPORT: BASELINE vs {algo_name.upper()} 🌟")
    print("="*50)
    
    b_wait = base_metrics["avg_wait_time"]
    o_wait = opt_metrics["avg_wait_time"]
    wait_diff = o_wait - b_wait
    wait_pct = (wait_diff / b_wait * 100) if b_wait > 0 else 0

    b_travel = base_metrics["avg_travel_time"]
    o_travel = opt_metrics["avg_travel_time"]
    travel_diff = o_travel - b_travel
    travel_pct = (travel_diff / b_travel * 100) if b_travel > 0 else 0

    print(f"1. Average Passenger Wait Time:")
    print(f"   Baseline:  {b_wait:.2f} mins")
    print(f"   Optimized: {o_wait:.2f} mins")
    print(f"   Change:    {wait_diff:+.2f} mins ({wait_pct:+.1f}%)")
    if wait_diff < 0: print("   ✅ Passengers wait significantly less!")
    
    print(f"\n2. Average Travel Time:")
    print(f"   Baseline:  {b_travel:.2f} mins")
    print(f"   Optimized: {o_travel:.2f} mins")
    print(f"   Change:    {travel_diff:+.2f} mins ({travel_pct:+.1f}%)")
    
    print("="*50 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Run Optimization & Simulation Viewer")
    parser.add_argument("--mode", choices=["baseline", "ga", "sa", "pso", "aco"], required=True, help="Mode to run")
    args = parser.parse_args()

    print(f"🚀 Initializing Environment for {args.mode.upper()} mode...")
    graph, fixed_routes, stops, ctx = setup_environment()

    # Always evaluate baseline for comparison
    base_metrics, base_schedule = get_simulation_metrics(fixed_routes, ctx)
    
    if args.mode == "baseline":
        final_schedule = base_schedule
        print("\n📊 BASELINE METRICS:")
        print(f"Average Wait Time:   {base_metrics['avg_wait_time']:.2f} mins")
        print(f"Average Travel Time: {base_metrics['avg_travel_time']:.2f} mins")
    else:
        print(f"\n🧠 Running {args.mode.upper()} Algorithm... (This may take a moment)")
        if args.mode == "ga":
            solution, _, _ = run_ga(ctx, generations=10) # 10 for quick interactive
        elif args.mode == "sa":
            solution, _, _ = run_sa(ctx)
        elif args.mode == "pso":
            solution, _, _ = run_pso(fixed_routes, ctx)
        elif args.mode == "aco":
            solution, _, _ = run_aco(ctx)
            
        opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        print_comparison(base_metrics, opt_metrics, args.mode)

    # Save output and launch SUMO
    json_path = f"{args.mode}_schedule.json"
    with open(json_path, "w") as f:
        json.dump(final_schedule, f, indent=4)
        
    print(f"\n⚙️ Generating SUMO scenario files for {args.mode}...")
    cmd_gen = ["python3", "src/models/generate_real_schedule.py", "--prefix", args.mode, "--input", json_path]
    subprocess.run(cmd_gen, check=True)
    
    cfg_file = f"src/models/sumo_output/{args.mode}.sumocfg"
    print(f"🖥️ Launching SUMO-GUI with {cfg_file}...")
    cmd_sumo = ["sumo-gui", "-c", cfg_file]
    subprocess.run(cmd_sumo)

if __name__ == "__main__":
    main()
