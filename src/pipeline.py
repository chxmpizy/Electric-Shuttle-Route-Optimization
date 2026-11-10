"""Bootstrap helpers for building the optimization pipeline."""
import random
import networkx as nx
from config.settings import (
    END_TIME,
    MAX_PER_ROUTE,
    MIN_PER_ROUTE,
    NUM_ROUTES,
    RANDOM_SEED,
    START_TIME,
    TOTAL_BUSES,
)
from data.cleaning import load_routes
from data.graph import build_graph, make_bidirectional
from data.timetable import load_cs_periods_csv
from data.routes import HUB_STOPS, build_fixed_routes, get_all_stops
from optimization.context import RouteContext
DEMAND_DAYS = ["อังคาร", "พฤหัสบดี"]
DEMAND_TERMS = [1]
STUDENTS_PER_YEAR = 70


def setup_environment(seed: int = RANDOM_SEED) -> tuple[nx.DiGraph, list[dict], list[str], RouteContext]:
    """Load data, build graph, and return shared optimization context."""
    random.seed(seed)
    _ = load_routes()
    graph = make_bidirectional(build_graph())
    fixed_routes = build_fixed_routes(graph)
    stops = get_all_stops()
    ctx = RouteContext(
        graph=graph,
        stops=stops,
        hub_stops=HUB_STOPS,
        num_routes=NUM_ROUTES,
        min_per_route=MIN_PER_ROUTE,
        max_per_route=MAX_PER_ROUTE,
        total_buses=TOTAL_BUSES,
        start_time=START_TIME,
        end_time=END_TIME,
    )
    # Demand ชุดเดียวกับ cs_benchmark.py — ตารางเรียน CS เทอม 1 อังคาร+พฤหัส ชั้นปีละ 70 คน
    demands = load_cs_periods_csv(
        day_filter=DEMAND_DAYS,
        term_filter=DEMAND_TERMS,
        graph=graph,
        students_per_year=STUDENTS_PER_YEAR,
    )
    if demands:
        ctx.passenger_demands = demands
        ctx.end_time = max(max(int(d.class_start_time) + 60 for d in demands), 900)
        ctx.eval_seed = seed
    return graph, fixed_routes, stops, ctx