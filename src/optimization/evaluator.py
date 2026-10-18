"""
src/optimization/evaluator.py
==============================
ประเมินคะแนน Chromosome ผ่าน Simulation

การเปลี่ยนแปลงจากเวอร์ชันก่อน:
  - รับ passenger_demands เป็น Fixed demand list (ไม่สร้างผู้โดยสารใหม่ระหว่าง evaluate)
  - ส่ง graph เข้า run_simulation เพื่อใช้เวลาระหว่างป้ายจากกราฟจริง
  - simulation_time คงที่ ไม่ขึ้นกับ chromosome
  - ส่ง total_buses ให้ fitness() สำหรับ fleet cost ในอนาคต
"""
from __future__ import annotations
from typing import Optional, TYPE_CHECKING

from optimization.context import RouteContext
from optimization.fitness import fitness
from simulation.engine import run_simulation

if TYPE_CHECKING:
    from data.timetable import PassengerDemand


def evaluate(
    chromosome: list[dict],
    ctx: RouteContext,
    runs: int = 1,
    passenger_demands: Optional[list] = None,
    seed: Optional[int] = None,
) -> float:
    """
    คำนวณคะแนน Chromosome (ยิ่งต่ำยิ่งดี)

    Parameters
    ----------
    chromosome        : รายการ route dict
    ctx               : RouteContext (graph, stops, ...)
    runs              : จำนวนรอบที่รัน (เฉลี่ยผล)
    passenger_demands : Fixed demand list จาก timetable (None = สุ่ม legacy mode)
    seed              : Random seed สำหรับ reproducibility

    Notes
    -----
    simulation_time ถูกกำหนดเป็น ctx.end_time เสมอ
    เพื่อให้ทุก chromosome ถูกประเมินบน horizon เดียวกัน
    """
    simulation_time = ctx.end_time

    active_routes = [
        {
            "path": gene["path"],
            "num_bus": gene["num_bus"],
            "cycle_time": gene["cycle_time"],
            "headway": gene["headway"],
            "startTime": gene["startTime"],
            "endTime": gene["endTime"],
        }
        for gene in chromosome
    ]
    total_buses = sum(gene["num_bus"] for gene in chromosome)

    scores = []
    for run_i in range(runs):
        run_seed = (seed + run_i) if seed is not None else None
        result = run_simulation(
            active_routes=active_routes,
            stops=ctx.stops,
            simulation_time=simulation_time,
            passenger_demands=passenger_demands,
            graph=ctx.graph,
            seed=run_seed,
        )
        base_score = fitness(result, total_buses=total_buses)

        # ─── Structural penalties (ไม่เปลี่ยน) ──────────────────────────────
        served_stops: set[str] = set()
        for gene in chromosome:
            served_stops.update(gene["path"])
        coverage = len(served_stops) / max(1, len(ctx.stops))
        coverage_penalty = (0.8 - coverage) * 10 if coverage < 0.8 else 0.0

        stop_count: dict[str, int] = {}
        for route in chromosome:
            for stop in route["path"]:
                stop_count[stop] = stop_count.get(stop, 0) + 1
        overlap_penalty = sum(
            (count - (4 if stop in ctx.hub_stops else 2)) * 0.5
            for stop, count in stop_count.items()
            if count > (4 if stop in ctx.hub_stops else 2)
        )

        route_length_penalty = sum(
            1 for route in chromosome if len(route["path"]) < 5
        )

        bus_penalty = (
            (total_buses - ctx.total_buses) * 2
            if total_buses > ctx.total_buses
            else 0.0
        )

        final_score = (
            base_score
            + coverage_penalty
            + overlap_penalty
            + route_length_penalty
            + bus_penalty
        )
        scores.append(final_score)

    return sum(scores) / len(scores)
