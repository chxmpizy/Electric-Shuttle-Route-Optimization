"""Shared optimization context passed to chromosome and evaluator logic."""
from dataclasses import dataclass
import networkx as nx
@dataclass
class RouteContext:
    graph: nx.DiGraph
    stops: list[str]
    hub_stops: set[str]
    num_routes: int
    min_per_route: int
    max_per_route: int
    total_buses: int
    start_time: int
    end_time: int