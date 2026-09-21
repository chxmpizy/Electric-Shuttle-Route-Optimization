import sys
import random
import xml.etree.ElementTree as ET
from pathlib import Path
import sumolib

net_file = "src/models/sumo_output/thammasat.net.xml"
net = sumolib.net.readNet(net_file)

edges = [e for e in net.getEdges() if e.allows("bus")]
if not edges:
    edges = net.getEdges()

routes = ET.Element("routes")
ET.SubElement(routes, "vType", id="ev_bus", vClass="bus", guiShape="bus", color="0,100,220", length="12.0", maxSpeed="11.11", personCapacity="30")
ET.SubElement(routes, "vType", id="ev_bus_red", vClass="bus", guiShape="bus", color="220,50,50", length="12.0", maxSpeed="11.11", personCapacity="30")
ET.SubElement(routes, "vType", id="ev_bus_green", vClass="bus", guiShape="bus", color="50,220,50", length="12.0", maxSpeed="11.11", personCapacity="30")

bus_types = ["ev_bus", "ev_bus_red", "ev_bus_green"]

for i in range(6):
    start = random.choice(edges)
    end = random.choice(edges)
    path_edges, cost = net.getShortestPath(start, end)
    if path_edges:
        edge_ids = " ".join([e.getID() for e in path_edges])
        ET.SubElement(routes, "route", id=f"route_{i}", edges=edge_ids)
        for bus in range(5):
            ET.SubElement(routes, "vehicle", id=f"ev_{i}_{bus}", type=bus_types[i % len(bus_types)], route=f"route_{i}", depart=str(bus * 30))

ET.ElementTree(routes).write("src/models/sumo_output/thammasat.rou.xml", encoding="utf-8", xml_declaration=True)
