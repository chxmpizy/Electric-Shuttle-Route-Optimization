"""Campus transit graph construction and cycle-time utilities."""
import networkx as nx
def km_to_min(km: float, speed_kmh: float = 50.0) -> float:
    """Convert distance (km) to travel time (minutes) at a given speed."""
    return round(km * 60 / speed_kmh, 2)
def _add_route_edges(graph: nx.DiGraph, edges: list[tuple[str, str, float]]) -> None:
    for source, target, km in edges:
        graph.add_edge(source, target, weight=km_to_min(km))

import math

GPS_COORDS = {
    "Depot": (100.61550, 14.07750),
    "Dome": (100.59560, 14.07542),
    "Hospital": (100.61500, 14.07720),
    "Dorm": (100.60000, 14.06700),
    "Gate1": (100.60750, 14.06650),
    "Library": (100.60150, 14.07130),
    "Park": (100.60200, 14.07250),
    "SC1": (100.60500, 14.07200),
    "SC2_SC3": (100.60400, 14.07000),
    "Green": (100.59800, 14.06900),
    "Convention": (100.60100, 14.06800),
    "Terminal": (100.60700, 14.06900),
    "Lecture": (100.60450, 14.07300),
    "Health": (100.61300, 14.07600),
    "Social": (100.59900, 14.07400),
}

def haversine(lon1, lat1, lon2, lat2):
    """Calculate the great circle distance between two points in km."""
    R = 6371.0 # Earth radius in km
    dlon = math.radians(lon2 - lon1)
    dlat = math.radians(lat2 - lat1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_real_dist(stop1, stop2, routing_factor=1.3):
    """Get real-world distance between stops multiplied by a road-routing factor."""
    if stop1 not in GPS_COORDS or stop2 not in GPS_COORDS:
        return 1.0
    lon1, lat1 = GPS_COORDS[stop1]
    lon2, lat2 = GPS_COORDS[stop2]
    dist_km = haversine(lon1, lat1, lon2, lat2)
    return max(0.1, dist_km * routing_factor)

def build_graph() -> nx.DiGraph:
    """Build the directed campus transit graph with real-world edge weights in minutes."""
    graph = nx.DiGraph()
    stops = [
        "Dorm", "Green", "SC2_SC3", "Health", "Lecture",
        "Convention", "Terminal", "Library", "Hospital", "Park",
        "Dome", "Gate1", "SC1", "Social",
    ]
    graph.add_nodes_from(stops)
    
    # We will build a fully connected graph for these specific adjacent nodes
    # based on the original topologies, but using real distances.
    edges_list = [
        ("Dorm", "Green"), ("Green", "SC2_SC3"), ("SC2_SC3", "Health"), ("Health", "Lecture"), ("Lecture", "Dorm"),
        ("Convention", "Terminal"), ("Terminal", "SC2_SC3"), ("SC2_SC3", "Library"), ("Library", "Dorm"), ("Dorm", "Convention"),
        ("Convention", "Dorm"), ("Dorm", "Library"), ("Library", "SC2_SC3"), ("SC2_SC3", "Terminal"), ("Terminal", "Convention"),
        ("Convention", "Hospital"), ("Hospital", "Health"), ("Health", "Park"), ("Park", "Lecture"), ("Lecture", "Convention"),
        ("Dome", "Gate1"), ("Gate1", "SC1"), ("SC1", "Library"), ("Library", "Green"), ("Green", "Dorm"),
        ("Convention", "Social"), ("Social", "Lecture"), ("Lecture", "Park"), ("Park", "Health"), ("Health", "Hospital")
    ]
    
    for s, t in edges_list:
        km = get_real_dist(s, t)
        graph.add_edge(s, t, weight=km_to_min(km))
        
    return graph
def make_bidirectional(graph: nx.DiGraph) -> nx.DiGraph:
    """Add reverse edges so routes can run in both directions."""
    edges = list(graph.edges(data=True))
    for source, target, data in edges:
        graph.add_edge(target, source, weight=data["weight"])
    return graph
def calculate_cycle_time(route_path: list[str], graph: nx.DiGraph) -> float:
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