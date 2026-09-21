"""Fixed route definitions and stop metadata."""
import networkx as nx
from data.graph import calculate_cycle_time
HUB_STOPS = {"Convention", "Lecture", "Terminal"}
CANDIDATE_STOPS = [
    "Dorm",
    "Green",
    "SC2_SC3",
    "Health",
    "Lecture",
]
ALL_STOPS = [
    "Dorm", "Green", "SC2_SC3", "Terminal", "Convention", "Library", "Social",
    "Lecture", "Park", "Health", "Hospital", "SC1", "Gate1", "Dome",
]
def get_all_stops() -> list[str]:
    return ALL_STOPS.copy()
def _route(
    route_id: int,
    path: list[str],
    graph: nx.DiGraph,
    start_time: int,
    end_time: int,
    num_bus: int = 5,
) -> dict:
    cycle_time = calculate_cycle_time(path, graph)
    return {
        "route_id": route_id,
        "path": path,
        "num_bus": num_bus,
        "cycle_time": cycle_time,
        "headway": round(cycle_time / num_bus, 2),
        "startTime": start_time,
        "endTime": end_time,
    }
def build_fixed_routes(graph: nx.DiGraph) -> list[dict]:
    """Build the six baseline campus bus routes for simulation."""
    definitions = [
        (1, ["Convention", "Terminal", "SC2_SC3", "Library", "Dorm", "Convention"], 420, 1250),
        (2, ["Convention", "Dorm", "Library", "SC2_SC3", "Terminal", "Convention"], 410, 1290),
        (3, ["Convention", "Hospital", "Health", "Park", "Lecture", "Convention"], 400, 1295),
        (4, ["Dome", "Gate1", "SC1", "Library", "Green", "Dorm"], 420, 1295),
        (5, ["Convention", "Social", "Lecture", "Park", "Health", "Hospital"], 420, 1080),
        (6, ["Dorm", "Green", "SC2_SC3", "Health", "Lecture", "Dorm"], 450, 1300),
    ]
    return [_route(rid, path, graph, start, end) for rid, path, start, end in definitions]