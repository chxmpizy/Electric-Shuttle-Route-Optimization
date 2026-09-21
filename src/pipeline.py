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
from data.routes import HUB_STOPS, build_fixed_routes, get_all_stops
from optimization.context import RouteContext
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
    return graph, fixed_routes, stops, ctx