from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sys
import json
import subprocess
import os
import time
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
from models.sumo import find_sumo_binary, get_sumo_env


import networkx as nx
# Feedback #10: ใช้ segment-time helper + DWELL/LAYOVER ร่วมกันกับ Simulation
# เพื่อให้ตารางเวลาที่โชว์บนหน้าเว็บตรงกับที่ engine และ fitness ใช้ประเมิน
from simulation.engine import _build_segment_times, DWELL_TIME_MIN, LAYOVER_TIME_MIN
# Trip planner constants/mappings (Díaz-Ramírez 2022 timing formula)
from data.timetable import (
    WALK_TIME_MIN,
    BUILDING_TO_STOP,
    DEFAULT_WALK_MIN,
    BUFFER_MIN,
    ARRIVE_BEFORE_MIN,
)


def attach_timetable(schedule, graph):
    """
    แนบ timetable ให้แต่ละ route — เวลาถึงป้ายคำนวณด้วย
    _build_segment_times() + DWELL_TIME_MIN (ชุดเดียวกับ engine.run_simulation)
    """
    for route in schedule:
        path = route["path"]
        start_time = float(route.get("startTime", 420))
        cycle_time = float(route.get("cycle_time", max(1, len(path) - 1)))
        seg_times = _build_segment_times(path, graph, cycle_time)

        timetable = []
        current_time = start_time
        for i, stop in enumerate(path):
            if i > 0:
                current_time += float(seg_times[i - 1]) + DWELL_TIME_MIN
            timetable.append({"stop": stop, "arrival_time": round(current_time, 2)})
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

# Attach CS timetable demand so search AND final eval both use real passenger demand
# (addresses feedback #1,#7 — avoid random-demand bias in live dashboard)
try:
    from data.timetable import load_cs_timetable
    _demands = load_cs_timetable(
        xlsx_path="data/raw/cs_timetable.xlsx",
        day_filter=["อังคาร", "พฤหัสบดี"],
        graph=graph,
    )
    _max_t = max(int(d.class_start_time) + 60 for d in _demands) if _demands else ctx.end_time
    ctx.end_time = max(_max_t, 900)
    ctx.passenger_demands = _demands
    ctx.eval_seed = 42
    print(f"[api] loaded {len(_demands)} CS demand records; sim_window={ctx.end_time} min")
except Exception as _e:
    print(f"[api] CS timetable unavailable, falling back to random demand: {_e}")

base_metrics, base_schedule = get_simulation_metrics(fixed_routes, ctx)

class MetricsResponse(BaseModel):
    baseline_wait: float
    baseline_travel: float
    baseline_served: int | None = 0
    baseline_waiting: int | None = 0
    baseline_schedule: list = []
    optimized_wait: float
    optimized_travel: float
    optimized_served: int | None = 0
    optimized_waiting: int | None = 0
    schedule: list = []
    # Feedback #7: fair comparison needs timing + convergence history
    history: list[float] = []
    elapsed_sec: float = 0.0
    algorithm: str = ""
    # Feedback #1,#6: on-time rate + fleet utilization visibility
    on_time_rate_pct: float | None = None
    late_passengers: int | None = None
    stranded_passengers: int | None = None
    total_passengers: int | None = None
    total_buses: int | None = None
    fleet_utilization_pct: float | None = None
    bus_stats: list = []
    # Feedback #5: Mobility insights
    od_matrix: list = []
    mobility_timeseries: list = []
    data_source: str = "live"

# Pre-attach timetable to base schedule
base_schedule_with_timetable = attach_timetable(base_schedule, ctx.graph)

@app.get("/api/baseline")
def get_baseline():
    return {
        "wait_time": base_metrics["avg_wait_time"],
        "travel_time": base_metrics["avg_travel_time"],
        "served": base_metrics.get("served_passengers", 0),
        "waiting": base_metrics.get("waiting_passengers", 0),
        "schedule": base_schedule_with_timetable
    }

@app.get("/api/benchmark")
def get_benchmark():
    algos = ["baseline", "ga", "sa", "pso", "aco"]
    benchmark_data = {}
    for a in algos:
        json_path = f"{a}_schedule.json"
        if Path(json_path).exists():
            try:
                with open(json_path) as f:
                    sched = json.load(f)
                metrics, _ = get_simulation_metrics(sched, ctx)
                benchmark_data[a] = {
                    "algorithm": a.upper(),
                    "wait_time": metrics["avg_wait_time"],
                    "travel_time": metrics["avg_travel_time"],
                    "total_time": round(metrics["avg_wait_time"] + metrics["avg_travel_time"], 2),
                    "served": metrics.get("served_passengers", 0),
                    "waiting": metrics.get("waiting_passengers", 0),
                    "num_routes": len(sched),
                    "total_buses": sum(r.get("num_bus", 0) for r in sched),
                    "avg_headway": round(sum(r.get("headway", 0) for r in sched) / max(1, len(sched)), 2),
                    # Feedback #1,#6: on-time + fleet utilization
                    "on_time_rate_pct": metrics.get("on_time_rate_pct"),
                    "late_passengers": metrics.get("late_passengers"),
                    "stranded_passengers": metrics.get("stranded_passengers"),
                    "total_passengers": metrics.get("total_passengers"),
                    "fleet_utilization_pct": metrics.get("fleet_utilization_pct"),
                    "bus_stats": metrics.get("bus_stats", []),
                    "schedule": sched,
                }
            except Exception as e:
                print(f"Error benchmark {a}: {e}")
    return benchmark_data

# ─── Trip Planner ────────────────────────────────────────────────────────────
# Díaz-Ramírez et al. (2022) หัวข้อ 3.2: ให้ผู้โดยสารมาถึงปลายทาง "ก่อนเวลาเรียน
# แต่ไม่เร็วเกินไป" ภายใต้ time-window
#     target_at_stop = class_start − walk − travel − buffer − arrive_before
# สูตรนี้ตอบคำถาม: "เรียน 08:00 ที่ตึก X → ต้องไปรอรถที่ป้าย Y เวลาเท่าไร"

_latest_schedule_cache: dict = {"schedule": None, "algo": "baseline"}


class TripPlanRequest(BaseModel):
    origin: str                            # Stop ID เช่น "Dorm"
    destination: str                       # Stop ID เช่น "Lecture" หรือ "SC2_SC3"
    class_start_minutes: int               # นาทีจากเที่ยงคืน เช่น 480 = 08:00
    walk_minutes: float | None = None      # ถ้า None → ใช้ค่า default ตาม destination
    buffer_minutes: float = BUFFER_MIN     # ค่าเผื่อเวลาเดินทางคลาดเคลื่อน
    arrive_before_minutes: float = ARRIVE_BEFORE_MIN  # Comfort Early Bound
    algorithm: str | None = None           # None → ใช้ schedule ล่าสุด / baseline


def _plan_trip(
    schedule: list,
    origin: str,
    destination: str,
    class_start: float,
    walk: float,
    buffer_min: float,
    arrive_before: float,
) -> list[dict]:
    """
    หา option การเดินทางที่ให้ผู้โดยสารถึงอาคารก่อนเริ่มเรียน
    คืน list ของ option ที่เป็นไปได้ เรียงจาก "ขึ้นรถสายที่สุดที่ยังทัน" → "สายน้อยลง"
    """
    options: list[dict] = []
    deadline_at_dest = class_start - walk - buffer_min - arrive_before

    for r_idx, route in enumerate(schedule):
        path = route.get("path", [])
        timetable = route.get("timetable", [])
        headway = float(route.get("headway", 0)) or 0.0
        start_time = float(route.get("startTime", 420))
        end_time = float(route.get("endTime", 1260))

        if origin not in path or destination not in path:
            continue
        try:
            o_idx = path.index(origin)
            d_idx = path.index(destination)
        except ValueError:
            continue
        if o_idx >= d_idx or o_idx >= len(timetable) or d_idx >= len(timetable):
            continue

        first_bus_at_origin = float(timetable[o_idx]["arrival_time"])
        first_bus_at_dest = float(timetable[d_idx]["arrival_time"])
        segment_duration = first_bus_at_dest - first_bus_at_origin
        if segment_duration <= 0 or headway <= 0:
            continue

        # หา k สูงสุด: first + k*headway + segment ≤ deadline
        latest_depart_origin = deadline_at_dest - segment_duration
        if latest_depart_origin < first_bus_at_origin:
            # แม้คันแรกก็ยังสายเกินไป ไม่มีทางทัน
            continue
        k_max = int((latest_depart_origin - first_bus_at_origin) // headway)
        if k_max < 0:
            continue

        # เก็บ 3 options: k_max (best), k_max-1, k_max-2 (ถ้ามี)
        for k in range(k_max, max(-1, k_max - 3), -1):
            if k < 0:
                break
            bus_at_origin = first_bus_at_origin + k * headway
            if bus_at_origin > end_time:
                continue
            bus_at_dest = bus_at_origin + segment_duration
            walk_arrival_at_building = bus_at_dest + walk
            slack = class_start - walk_arrival_at_building

            options.append({
                "route_index": r_idx,
                "route_path": path,
                "origin_stop": origin,
                "destination_stop": destination,
                "headway_minutes": round(headway, 2),
                "num_bus_on_route": route.get("num_bus", None),
                # เวลา (นาทีจากเที่ยงคืน) — frontend จัดฟอร์แมตเป็น HH:MM
                "recommended_at_stop_minutes": round(max(0.0, bus_at_origin - 2.0), 2),
                "bus_arrives_origin_minutes": round(bus_at_origin, 2),
                "bus_arrives_destination_minutes": round(bus_at_dest, 2),
                "walk_arrival_at_building_minutes": round(walk_arrival_at_building, 2),
                "class_start_minutes": round(class_start, 2),
                # วินิจฉัย
                "slack_before_class_minutes": round(slack, 2),
                "comfortable": slack >= arrive_before,
                "trip_duration_minutes": round(bus_at_dest - bus_at_origin, 2),
                "walk_minutes": round(walk, 2),
                "buffer_minutes": round(buffer_min, 2),
            })

    # เรียงจาก "ออกจากป้ายต้นทางช้าที่สุด" ก่อน (= เสียเวลารอน้อยที่สุด)
    options.sort(key=lambda o: -o["bus_arrives_origin_minutes"])
    return options


def _resolve_schedule_for_algo(algo: str | None) -> tuple[list, str]:
    """เลือก schedule จาก cache ล่าสุด / baseline / ไฟล์ที่เคย save"""
    algo = (algo or _latest_schedule_cache.get("algo") or "baseline").lower()
    if algo == "baseline":
        return base_schedule_with_timetable, "baseline"
    json_path = f"{algo}_schedule.json"
    if Path(json_path).exists():
        try:
            with open(json_path) as f:
                sched = json.load(f)
            # บาง schedule เก่าอาจไม่มี timetable → แนบใหม่
            if sched and "timetable" not in sched[0]:
                sched = attach_timetable(sched, ctx.graph)
            return sched, algo
        except Exception:
            pass
    # ตก fallback → baseline
    return base_schedule_with_timetable, "baseline"


@app.post("/api/plan-trip")
def plan_trip(req: TripPlanRequest):
    # แปลง building code → stop ถ้าจำเป็น
    dest_stop = BUILDING_TO_STOP.get(req.destination.strip().upper(), req.destination)
    origin_stop = BUILDING_TO_STOP.get(req.origin.strip().upper(), req.origin)
    walk = req.walk_minutes if req.walk_minutes is not None else WALK_TIME_MIN.get(dest_stop, DEFAULT_WALK_MIN)

    schedule, algo_used = _resolve_schedule_for_algo(req.algorithm)
    options = _plan_trip(
        schedule=schedule,
        origin=origin_stop,
        destination=dest_stop,
        class_start=float(req.class_start_minutes),
        walk=float(walk),
        buffer_min=float(req.buffer_minutes),
        arrive_before=float(req.arrive_before_minutes),
    )

    return {
        "algorithm": algo_used.upper(),
        "origin_stop": origin_stop,
        "destination_stop": dest_stop,
        "walk_minutes": walk,
        "buffer_minutes": req.buffer_minutes,
        "arrive_before_minutes": req.arrive_before_minutes,
        "class_start_minutes": req.class_start_minutes,
        "options": options,
        "formula_note": (
            "target_at_stop = class_start − walk − travel − buffer − arrive_before "
            "(อ้างอิง Díaz-Ramírez et al. 2022, §3.2)"
        ),
    }


@app.get("/api/planner-metadata")
def planner_metadata():
    """คืนข้อมูลประกอบฟอร์ม: รายการป้าย, building→stop, default walk time"""
    return {
        "stops": stops,
        "building_to_stop": BUILDING_TO_STOP,
        "walk_time_defaults": WALK_TIME_MIN,
        "default_walk_minutes": DEFAULT_WALK_MIN,
        "default_buffer_minutes": BUFFER_MIN,
        "default_arrive_before_minutes": ARRIVE_BEFORE_MIN,
    }


@app.post("/api/run/{algorithm}", response_model=MetricsResponse)
def run_algorithm(algorithm: str):
    algo = algorithm.lower()
    history: list[float] = []
    t0 = time.time()
    try:
        if algo == "baseline":
            opt_metrics, final_schedule = base_metrics, base_schedule
        elif algo == "ga":
            solution, _, history = run_ga(ctx, generations=10)
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        elif algo == "sa":
            solution, _, history = run_sa(ctx)
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        elif algo == "pso":
            solution, _, history = run_pso(fixed_routes, ctx)
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        elif algo == "aco":
            solution, _, history = run_aco(ctx, iterations=20, num_ants=10)
            opt_metrics, final_schedule = get_simulation_metrics(solution, ctx)
        else:
            raise HTTPException(status_code=400, detail="Unknown algorithm")
        elapsed = round(time.time() - t0, 2)
            
        # Generate files
        json_path = f"{algo}_schedule.json"
        final_schedule = attach_timetable(final_schedule, ctx.graph)
        with open(json_path, "w") as f:
            json.dump(final_schedule, f, indent=4)
        # Trip-planner จะใช้ schedule นี้เป็น default ครั้งต่อไป
        _latest_schedule_cache["schedule"] = final_schedule
        _latest_schedule_cache["algo"] = algo


        cmd_gen = [sys.executable, "src/models/generate_real_schedule.py", "--prefix", algo, "--input", json_path]
        env = get_sumo_env()
        env["PYTHONPATH"] = str(Path("src").resolve())
        proc = subprocess.run(cmd_gen, capture_output=True, text=True, env=env)
        if proc.returncode != 0:
            print("ERROR generating SUMO schedule:", proc.stderr)
            raise HTTPException(status_code=500, detail=f"Generation failed: {proc.stderr}")
        
        return MetricsResponse(
            baseline_wait=base_metrics["avg_wait_time"],
            baseline_travel=base_metrics["avg_travel_time"],
            baseline_served=base_metrics.get("served_passengers", 0),
            baseline_waiting=base_metrics.get("waiting_passengers", 0),
            baseline_schedule=base_schedule_with_timetable,
            optimized_wait=opt_metrics["avg_wait_time"],
            optimized_travel=opt_metrics["avg_travel_time"],
            optimized_served=opt_metrics.get("served_passengers", 0),
            optimized_waiting=opt_metrics.get("waiting_passengers", 0),
            schedule=final_schedule,
            history=[round(float(h), 4) for h in (history or [])],
            elapsed_sec=elapsed,
            algorithm=algo.upper(),
            on_time_rate_pct=opt_metrics.get("on_time_rate_pct"),
            late_passengers=opt_metrics.get("late_passengers"),
            stranded_passengers=opt_metrics.get("stranded_passengers"),
            total_passengers=opt_metrics.get("total_passengers"),
            total_buses=opt_metrics.get("total_buses") or sum(r.get("num_bus", 0) for r in final_schedule),
            fleet_utilization_pct=opt_metrics.get("fleet_utilization_pct"),
            bus_stats=opt_metrics.get("bus_stats", []),
            od_matrix=opt_metrics.get("od_matrix", []),
            mobility_timeseries=opt_metrics.get("mobility_timeseries", []),
            data_source="live",
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
            raise HTTPException(status_code=404, detail=f"Config file for {algo} not found. Run simulation first.")
        
        # Ensure XQuartz is running on macOS if present
        if sys.platform == "darwin":
            try:
                x_check = subprocess.run(["pgrep", "-f", "X11.bin"], capture_output=True, text=True)
                if x_check.returncode != 0:
                    subprocess.run(["open", "-a", "/Applications/Utilities/XQuartz.app"], check=False)
            except Exception:
                pass

        sumo_gui_bin = find_sumo_binary("sumo-gui")
        env = get_sumo_env()
        proc = subprocess.Popen([sumo_gui_bin, "-c", cfg_file], env=env)
        return {"message": f"SUMO-GUI launched successfully for {algo.upper()}", "pid": proc.pid}
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
