"""Build and run a SUMO visual simulation for EV-bus schedules.

The optimisation layer produces routes in campus-stop names and service times in
minutes. This module translates that schedule into SUMO XML, then lets SUMO or
SUMO-GUI visualise the vehicles. A small generated campus network is provided
for repeatable demonstrations; a production run can instead supply a converted
OpenStreetMap ``.net.xml`` and explicit SUMO edge sequences for each route.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


MODELS_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = MODELS_DIR / "sumo_output"


@dataclass(frozen=True)
class ScenarioFiles:
    """Files generated for one SUMO scenario."""

    directory: Path
    network: Path
    routes: Path
    config: Path
    tripinfo: Path


def _xml(root: ET.Element, path: Path) -> None:
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def _require_sumo_network(path: Path) -> None:
    if not path.is_file():
        raise FileNotFoundError(f"SUMO network not found: {path}")
    if ET.parse(path).getroot().tag != "net":
        raise ValueError(
            f"{path.name} is not a SUMO .net.xml file. It is an OSM export; "
            "convert it first with netconvert or use --demo."
        )


def _find_binary(name: str) -> str:
    binary = shutil.which(name)
    if not binary:
        raise RuntimeError(
            f"{name} was not found. Install Eclipse SUMO and add its bin directory to PATH."
        )
    return binary


def _route_edges(route: dict[str, Any], leg_edges: dict[str, list[str]] | None) -> list[str]:
    """Return physical SUMO edges for a logical route."""
    supplied = route.get("sumo_edges")
    if supplied:
        return list(supplied)
    if not leg_edges:
        raise ValueError(
            f"Route {route.get('route_id', '?')} has no sumo_edges. Add the edge "
            "sequence after mapping its stops onto the converted OSM network."
        )
    edges: list[str] = []
    for origin, destination in zip(route["path"], route["path"][1:]):
        key = f"{origin}->{destination}"
        if key not in leg_edges:
            raise ValueError(f"No physical edge mapping for route leg {key}.")
        for edge_id in leg_edges[key]:
            if not edges or edges[-1] != edge_id:
                edges.append(edge_id)
    return edges


def build_sumo_scenario(
    schedule: Iterable[dict[str, Any]],
    network: Path,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    *,
    leg_edges: dict[str, list[str]] | None = None,
    stop_edges: dict[str, str] | None = None,
) -> ScenarioFiles:
    """Create route/configuration XML for a schedule expressed in minutes."""
    _require_sumo_network(network)
    schedule = list(schedule)
    if not schedule:
        raise ValueError("A SUMO scenario needs at least one route.")
    output_dir.mkdir(parents=True, exist_ok=True)
    routes_path = output_dir / "ev_bus.rou.xml"
    config_path = output_dir / "ev_bus.sumocfg"
    tripinfo_path = output_dir / "tripinfo.xml"

    root = ET.Element("routes")
    ET.SubElement(root, "vType", id="ev_bus", vClass="bus", guiShape="bus", length="9.0", maxSpeed="11.11", personCapacity="30", lcStrategic="2.0", lcCooperative="2.0")
    latest_end = 0.0
    vehicles: list[tuple[float, str, str, dict]] = []
    for route in schedule:
        route_id = str(route.get("route_id", "route"))
        edges = _route_edges(route, leg_edges)
        if not edges:
            raise ValueError(f"Route {route_id} has no SUMO edges.")
        sumo_route_id = f"route_{route_id}"
        ET.SubElement(root, "route", id=sumo_route_id, edges=" ".join(edges))
        start, end = float(route["startTime"]), float(route["endTime"])
        headway, buses = float(route["headway"]), int(route["num_bus"])
        if buses < 1 or headway <= 0 or end < start:
            raise ValueError(f"Route {route_id} has an invalid bus count, headway, or service window.")
        departure, trip = start, 0
        while departure <= end:
            for bus_index in range(buses):
                bus_departure = departure + bus_index * headway
                if bus_departure <= end:
                    vehicles.append((bus_departure, f"ev_{route_id}_{trip}_{bus_index + 1}", sumo_route_id, route))
            departure += headway
            trip += 1
        latest_end = max(latest_end, end)
    for departure, vehicle_id, route_id, route_data in sorted(vehicles, key=lambda x: x[0]):
        veh_color = route_data.get("color", "255,165,0")
        veh = ET.SubElement(root, "vehicle", id=vehicle_id, type="ev_bus", route=route_id, depart=f"{departure * 60:.1f}", color=veh_color)
        if stop_edges and "path" in route_data:
            for stop_name in route_data["path"]:
                if stop_name in stop_edges:
                    lane_id = stop_edges[stop_name]
                    ET.SubElement(veh, "stop", lane=lane_id, duration="20")
    _xml(root, routes_path)

    configuration = ET.Element("configuration")
    input_element = ET.SubElement(configuration, "input")
    ET.SubElement(input_element, "net-file", value=str(network.resolve()))
    ET.SubElement(input_element, "route-files", value=routes_path.name)
    earliest_departure = min([d for d, _, _, _ in vehicles], default=0) if vehicles else 0
    time = ET.SubElement(configuration, "time")
    ET.SubElement(time, "begin", value=str(int(earliest_departure * 60)))
    ET.SubElement(time, "end", value=str(int((latest_end + 60) * 60)))
    ET.SubElement(time, "step-length", value="1")
    
    processing = ET.SubElement(configuration, "processing")
    ET.SubElement(processing, "time-to-teleport", value="15")
    output = ET.SubElement(configuration, "output")
    ET.SubElement(output, "tripinfo-output", value=tripinfo_path.name)
    _xml(configuration, config_path)
    return ScenarioFiles(output_dir, network, routes_path, config_path, tripinfo_path)


def build_demo_network(output_dir: Path = DEFAULT_OUTPUT_DIR) -> tuple[Path, dict[str, list[str]]]:
    """Generate a campus-shaped SUMO network for repeatable visual smoke tests."""
    from data.graph import build_graph, make_bidirectional

    output_dir.mkdir(parents=True, exist_ok=True)
    graph = make_bidirectional(build_graph())
    nodes_path, edges_path = output_dir / "demo.nod.xml", output_dir / "demo.edg.xml"
    network_path = output_dir / "demo.net.xml"
    positions = {
        "Dorm": (0, 0), "Green": (2, 0), "SC2_SC3": (4, 0), "Health": (6, 0), "Lecture": (8, 0),
        "Convention": (2, 3), "Terminal": (4, 3), "Library": (3, 1.5), "Hospital": (6, 3), "Park": (7, 1.5),
        "Dome": (0, 6), "Gate1": (2, 6), "SC1": (3, 4.5), "Social": (4, 4.5),
    }
    nodes = ET.Element("nodes")
    for stop, (x, y) in positions.items():
        ET.SubElement(nodes, "node", id=stop, x=str(x * 100), y=str(y * 100))
    _xml(nodes, nodes_path)
    edges, leg_edges = ET.Element("edges"), {}
    for origin, destination in graph.edges:
        edge_id = f"{origin}__{destination}"
        ET.SubElement(edges, "edge", id=edge_id, **{"from": origin, "to": destination}, speed="11.11", numLanes="1", priority="1")
        leg_edges[f"{origin}->{destination}"] = [edge_id]
    _xml(edges, edges_path)
    subprocess.run([_find_binary("netconvert"), "--node-files", str(nodes_path), "--edge-files", str(edges_path), "--output-file", str(network_path)], check=True, capture_output=True, text=True)
    return network_path, leg_edges


def run_sumo(scenario: ScenarioFiles, *, gui: bool = False) -> subprocess.CompletedProcess[str]:
    """Run a prepared scenario in headless SUMO or the interactive SUMO-GUI."""
    command = [_find_binary("sumo-gui" if gui else "sumo"), "-c", str(scenario.config)]
    if not gui:
        command.extend(["--no-step-log", "true", "--duration-log.disable", "true"])
    return subprocess.run(command, check=True, text=True)


def demo_scenario(output_dir: Path = DEFAULT_OUTPUT_DIR) -> ScenarioFiles:
    """Build the visual-simulation handoff from the baseline schedule."""
    from data.graph import build_graph, make_bidirectional
    from data.routes import build_fixed_routes

    schedule = build_fixed_routes(make_bidirectional(build_graph()))
    network, leg_edges = build_demo_network(output_dir)
    return build_sumo_scenario(schedule, network, output_dir, leg_edges=leg_edges)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or run the EV Bus SUMO visual simulation.")
    parser.add_argument("--demo", action="store_true", help="Build the included campus-shaped demonstration network.")
    parser.add_argument("--run", action="store_true", help="Run SUMO after creating the scenario.")
    parser.add_argument("--gui", action="store_true", help="Run with SUMO-GUI (requires --run).")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()
    if not args.demo:
        parser.error("Use --demo for the runnable sample; production OSM input needs explicit route edge mappings.")
    scenario = demo_scenario(args.output)
    print(f"SUMO scenario created: {scenario.config}")
    if args.run:
        run_sumo(scenario, gui=args.gui)
        print(f"Trip summary: {scenario.tripinfo}")


if __name__ == "__main__":
    main()
