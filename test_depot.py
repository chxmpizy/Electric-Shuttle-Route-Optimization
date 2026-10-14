from pathlib import Path
import sumolib
import math

net_file = "src/models/sumo_output/thammasat.net.xml"
net = sumolib.net.readNet(net_file)

gps_coordinates = {
    "Depot": (100.61450, 14.07850),
    "Hospital": (100.61500, 14.07720),
}

coordinates = {}
for name, (lon, lat) in gps_coordinates.items():
    coordinates[name] = net.convertLonLat2XY(lon, lat)

def dist(x, y, shape):
    min_d = float('inf')
    for px, py in shape:
        d = math.hypot(x - px, y - py)
        if d < min_d: min_d = d
    return min_d

for stop, (x, y) in coordinates.items():
    best_edge = None
    min_d = float('inf')
    for e in net.getEdges():
        if not e.allows("passenger") and not e.allows("bus"): continue
        d = dist(x, y, e.getShape())
        if d < min_d:
            min_d = d
            best_edge = e
    print(f"{stop} -> {best_edge.getID()} (dist {min_d:.1f})")
