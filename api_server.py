from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sys
import json
import subprocess
import os
from pathlib import Path
from pydantic import BaseModel
import traceback

# Add src to python path
sys.path.insert(0, str(Path("src").resolve()))

from pipeline import setup_environment
from run_sim import get_simulation_metrics
from algorithms.GA import run_ga
from algorithms.SA import run_sa
from algorithms.PSO import run_pso
from algorithms.ACO import run_aco


import networkx as nx

def attach_timetable(schedule, graph):
    for route in schedule:
        path = route["path"]
        start_time = route.get("startTime", 420)
        timetable = []
        current_time = start_time
        for i, stop in enumerate(path):
            if i > 0:
                prev_stop = path[i - 1]
                try:
                    travel_time = graph[prev_stop][stop]["weight"]
                except KeyError:
                    try:
                        travel_time = nx.shortest_path_length(graph, prev_stop, stop, weight="weight")
                    except Exception:
                        travel_time = 3 # fallback
                current_time += travel_time
            timetable.append({"stop": stop, "arrival_time": current_time})
        route["timetable"] = timetable
    return schedule

app = FastAPI(title="TU Shuttle Optimization API")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to hold context
graph, fixed_routes, stops, ctx = setup_environment()
base_metrics, base_schedule = get_simulation_metrics(fixed_routes, ctx)

class MetricsResponse(BaseModel):
    baseline_wait: float
    baseline_travel: float
    optimized_wait: float
    optimized_travel: float
    schedule: list = []

@app.get("/api/baseline")
def get_baseline():
    return {
        "wait_time": base_metrics["avg_wait_time"],
        "travel_time": base_metrics["avg_travel_time"]
    }

@app.post("/api/run/{algorithm}", response_model=MetricsResponse)
def run_algorithm(algorithm: str):
    algo = algorithm.lower()
    try:
        if algo == "baseline":
            opt_metrics, final_schedule = base_metrics, base_schedule
        elif algo == "ga":
            solution, _, _ = run_ga(ctx, generations=10)
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        elif algo == "sa":
            solution, _, _ = run_sa(ctx)
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        elif algo == "pso":
            solution, _, _ = run_pso(fixed_routes, ctx)
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        elif algo == "aco":
            solution, _, _ = run_aco(ctx, iterations=20, num_ants=10)
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        else:
            raise HTTPException(status_code=400, detail="Unknown algorithm")
            
        # Generate files
        json_path = f"{algo}_schedule.json"
        with open(json_path, "w") as f:
            final_schedule = attach_timetable(final_schedule, ctx.graph)
        json.dump(final_schedule, f, indent=4)
            
        cmd_gen = ["python3", "src/models/generate_real_schedule.py", "--prefix", algo, "--input", json_path]
        env = os.environ.copy()
        env["PYTHONPATH"] = str(Path("src").resolve())
        proc = subprocess.run(cmd_gen, capture_output=True, text=True, env=env)
        if proc.returncode != 0:
            print("ERROR generating SUMO schedule:", proc.stderr)
            raise HTTPException(status_code=500, detail=f"Generation failed: {proc.stderr}")
        
        return MetricsResponse(
            baseline_wait=base_metrics["avg_wait_time"],
            baseline_travel=base_metrics["avg_travel_time"],
            optimized_wait=opt_metrics["avg_wait_time"],
            optimized_travel=opt_metrics["avg_travel_time"],
            schedule=final_schedule
        )
    except Exception as e:
        print(traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/launch/{algorithm}")
def launch_sumo(algorithm: str):
    try:
        algo = algorithm.lower()
        cfg_file = f"src/models/sumo_output/{algo}.sumocfg"
        if not Path(cfg_file).exists():
            raise HTTPException(status_code=404, detail="Config file not found. Run simulation first.")
        
        subprocess.Popen(["sumo-gui", "-c", cfg_file])
        return {"message": "SUMO-GUI launched successfully"}
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
