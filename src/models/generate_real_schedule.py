import sys
import xml.etree.ElementTree as ET
from pathlib import Path
import sumolib
import math

models_dir = Path("src/models")
out_dir = models_dir / "sumo_output"
net_file = out_dir / "thammasat.net.xml"

coordinates = {
    "Dorm": (300, 500),
    "Green": (500, 600),
    "SC2_SC3": (1000, 800),
    "Health": (2000, 400),
    "Lecture": (1500, 600),
    "Convention": (1200, 1300),
    "Terminal": (1000, 1300),
    "Library": (1300, 900),
    "Hospital": (2200, 200),
    "Park": (1600, 400),
    "Dome": (800, 1500),
    "Gate1": (1200, 1500),
    "SC1": (1400, 1100),
    "Social": (1600, 1000),
}

def dist(x, y, shape):
    # min distance to polyline
    min_d = float('inf')
    for px, py in shape:
        d = math.hypot(x - px, y - py)
        if d < min_d: min_d = d
    return min_d

net = sumolib.net.readNet(str(net_file))

stop_edges = {}
all_edges = [e for e in net.getEdges() if "pedestrian" not in e.getPermissions() or len(e.getPermissions()) != 1] 
# try to avoid pure pedestrian edges if possible, but let's just take all
for stop, (x, y) in coordinates.items():
    best_edge = None
    min_d = float('inf')
    for e in net.getEdges():
        # only pick edges that allow passenger or bus (not pure sidewalk)
        if not e.allows("passenger") and not e.allows("bus"): continue
        d = dist(x, y, e.getShape())
        if d < min_d:
            min_d = d
            best_edge = e
    stop_edges[stop] = best_edge
    print(f"  {stop} -> {best_edge.getID()} (dist {min_d:.1f})")

from data.graph import build_graph, make_bidirectional
from data.routes import build_fixed_routes
from models.sumo import build_sumo_scenario

graph = make_bidirectional(build_graph())
schedule = build_fixed_routes(graph)

leg_edges = {}
for route in schedule:
    path = route["path"]
    for origin, dest in zip(path, path[1:]):
        key = f"{origin}->{dest}"
        if key not in leg_edges:
            o_edge = stop_edges[origin]
            d_edge = stop_edges[dest]
            path_edges, cost = net.getShortestPath(o_edge, d_edge)
            if not path_edges:
                print(f"Warning: No path from {origin} to {dest}!")
                path_edges = [o_edge, d_edge]
            leg_edges[key] = [e.getID() for e in path_edges]

# Apply distinct colors to routes for better visual
colors = ["0,100,220", "220,50,50", "50,220,50", "220,220,50", "220,0,220", "0,220,220"]
for i, route in enumerate(schedule):
    route["color"] = colors[i % len(colors)]

for route in schedule:
    route["num_bus"] = 5
    
stop_edges_str = {k: v.getID() for k, v in stop_edges.items()}
build_sumo_scenario(schedule, net_file, out_dir, leg_edges=leg_edges, stop_edges=stop_edges_str)

cfg_path = out_dir / "ev_bus.sumocfg"
tree = ET.parse(cfg_path)
root = tree.getroot()

input_node = root.find("input")
add_file = ET.SubElement(input_node, "additional-files")
add_file.set("value", "thammasat.poly.xml")

gui_only = ET.SubElement(root, "gui_only")
gui_settings = ET.SubElement(gui_only, "gui-settings-file")
gui_settings.set("value", "viewsettings.xml")

time_node = root.find("time")
end_node = time_node.find("end")
end_node.set("value", "50000")

ET.ElementTree(root).write(cfg_path, encoding="utf-8", xml_declaration=True)

report = ET.SubElement(root, "report")
ignore = ET.SubElement(report, "ignore-route-errors")
ignore.set("value", "true")
ET.ElementTree(root).write(cfg_path, encoding="utf-8", xml_declaration=True)
