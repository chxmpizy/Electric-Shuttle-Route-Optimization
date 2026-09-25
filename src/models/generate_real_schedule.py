import sys
import xml.etree.ElementTree as ET
from pathlib import Path
import sumolib
import math
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("--prefix", default="ev_bus", help="Prefix for SUMO output files")
parser.add_argument("--input", default="best_schedule.json", help="Path to schedule JSON")
args, _ = parser.parse_known_args()

models_dir = Path("src/models")
out_dir = models_dir / "sumo_output"
net_file = out_dir / "thammasat.net.xml"

# GPS Coordinates (Longitude, Latitude) for real-world bus stops
gps_coordinates = {
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


net = sumolib.net.readNet(str(net_file))
coordinates = {}
for name, (lon, lat) in gps_coordinates.items():
    coordinates[name] = net.convertLonLat2XY(lon, lat)

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

import json
if Path(args.input).exists():
    print(f"Loading optimized schedule from {args.input}...")
    with open(args.input, "r") as f:
        schedule = json.load(f)
else:
    print(f"{args.input} not found. Using baseline schedule...")
    schedule = build_fixed_routes(graph)


for route in schedule:
    start = float(route["startTime"])
    end = float(route["endTime"])
    cycle_time = float(route["cycle_time"])
    repeats = int((end - start) / max(1.0, cycle_time)) + 2
    
    path = route["path"]
    if path[0] == path[-1]:
        single_cycle = path[:-1]
        route["path"] = single_cycle * repeats + [path[-1]]
    else:
        route["path"] = path * repeats


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
    

add_root = ET.Element("additional")
stop_edges_str = {}
for stop_name, edge_obj in stop_edges.items():
    best_lane = None
    for lane in edge_obj.getLanes():
        if lane.allows("bus") or lane.allows("passenger"):
            best_lane = lane.getID()
            break
    if not best_lane:
        best_lane = edge_obj.getLanes()[0].getID()
    stop_edges_str[stop_name] = best_lane
    
    # Calculate pos
    edge_len = edge_obj.getLength()
    start_pos = max(0, edge_len - 16)
    end_pos = max(1, edge_len - 1)
    ET.SubElement(add_root, "busStop", id=f"busStop_{stop_name}", lane=best_lane, startPos=f"{start_pos:.2f}", endPos=f"{end_pos:.2f}", name=stop_name)

ET.ElementTree(add_root).write(out_dir / "bus_stops.add.xml", encoding="utf-8", xml_declaration=True)


build_sumo_scenario(schedule, net_file, out_dir, leg_edges=leg_edges, stop_edges=stop_edges_str, prefix=args.prefix)

cfg_path = out_dir / f"{args.prefix}.sumocfg"
tree = ET.parse(cfg_path)
root = tree.getroot()

input_node = root.find("input")
add_file = ET.SubElement(input_node, "additional-files")
add_file.set("value", "thammasat.poly.xml,bus_stops.add.xml")

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
