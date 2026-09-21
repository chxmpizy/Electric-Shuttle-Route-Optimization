"""Campus transit graph construction and cycle-time utilities."""
import networkx as nx
def km_to_min(km: float, speed_kmh: float = 20.0) -> int:
    """Convert distance (km) to travel time (minutes) at a given speed."""
    return round(km * 60 / speed_kmh)
def _add_route_edges(graph: nx.DiGraph, edges: list[tuple[str, str, float]]) -> None:
    for source, target, km in edges:
        graph.add_edge(source, target, weight=km_to_min(km))
def build_graph() -> nx.DiGraph:
    """Build the directed campus transit graph with edge weights in minutes."""
    graph = nx.DiGraph()
    stops = [
        "Dorm", "Green", "SC2_SC3", "Health", "Lecture",
        "Convention", "Terminal", "Library", "Hospital", "Park",
        "Dome", "Gate1", "SC1", "Social",
    ]
    graph.add_nodes_from(stops)
    _add_route_edges(graph, [
        ("Dorm", "Green", 1.2),
        ("Green", "SC2_SC3", 0.6),
        ("SC2_SC3", "Health", 1.0),
        ("Health", "Lecture", 0.5),
        ("Lecture", "Dorm", 1.9),
    ])
    _add_route_edges(graph, [
        ("Convention", "Terminal", 1.1),
        ("Terminal", "SC2_SC3", 0.65),
        ("SC2_SC3", "Library", 0.6),
        ("Library", "Dorm", 1.5),
        ("Dorm", "Convention", 3.6),
    ])
    _add_route_edges(graph, [
        ("Convention", "Dorm", 3.6),
        ("Dorm", "Library", 1.5),
        ("Library", "SC2_SC3", 0.6),
        ("SC2_SC3", "Terminal", 0.65),
        ("Terminal", "Convention", 1.1),
    ])
    _add_route_edges(graph, [
        ("Convention", "Hospital", 0.7),
        ("Hospital", "Health", 0.5),
        ("Health", "Park", 0.1),
        ("Park", "Lecture", 0.28),
        ("Lecture", "Convention", 0.15),
    ])
    for source, target in [
        ("Dome", "Gate1"), ("Gate1", "SC1"), ("SC1", "Library"),
        ("Library", "Green"), ("Green", "Dorm"),
    ]:
        graph.add_edge(source, target, weight=3)
    for source, target in [
        ("Convention", "Social"), ("Social", "Lecture"), ("Lecture", "Park"),
        ("Park", "Health"), ("Health", "Hospital"),
    ]:
        graph.add_edge(source, target, weight=3)
    return graph
def make_bidirectional(graph: nx.DiGraph) -> nx.DiGraph:
    """Add reverse edges so routes can run in both directions."""
    edges = list(graph.edges(data=True))
    for source, target, data in edges:
        graph.add_edge(target, source, weight=data["weight"])
    return graph
def calculate_cycle_time(route_path: list[str], graph: nx.DiGraph) -> int:
    """Calculate total cycle time for a route path on the graph."""
    total_time = 0
    for i in range(len(route_path) - 1):
        current_stop = route_path[i]
        next_stop = route_path[i + 1]
        try:
            total_time += graph[current_stop][next_stop]["weight"]
        except KeyError:
            try:
                total_time += nx.shortest_path_length(
                    graph,
                    source=current_stop,
                    target=next_stop,
                    weight="weight",
                )
            except nx.NetworkXNoPath:
                total_time += 999
    return total_time