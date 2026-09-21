"""Tests for the SUMO visual-simulation file generator."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import xml.etree.ElementTree as ET

from models.sumo import build_sumo_scenario


class SumoScenarioTests(unittest.TestCase):
    def test_schedule_is_translated_from_minutes_to_sumo_seconds(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            network = root / "network.net.xml"
            network.write_text("<net/>", encoding="utf-8")
            scenario = build_sumo_scenario(
                [{
                    "route_id": 1,
                    "path": ["Dorm", "Lecture"],
                    "sumo_edges": ["Dorm__Lecture"],
                    "num_bus": 1,
                    "headway": 10,
                    "startTime": 420,
                    "endTime": 430,
                }],
                network,
                root / "out",
            )
            routes = scenario.routes.read_text(encoding="utf-8")
            self.assertIn('edges="Dorm__Lecture"', routes)
            self.assertIn('depart="25200.0"', routes)
            self.assertIn('depart="25800.0"', routes)
            self.assertTrue(scenario.config.is_file())

    def test_vehicles_are_sorted_by_departure_time(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            network = root / "network.net.xml"
            network.write_text("<net/>", encoding="utf-8")
            scenario = build_sumo_scenario(
                [
                    {"route_id": 1, "path": ["A", "B"], "sumo_edges": ["A_B"], "num_bus": 1, "headway": 10, "startTime": 20, "endTime": 20},
                    {"route_id": 2, "path": ["C", "D"], "sumo_edges": ["C_D"], "num_bus": 1, "headway": 10, "startTime": 10, "endTime": 10},
                ],
                network,
                root / "out",
            )
            departures = [float(vehicle.attrib["depart"]) for vehicle in ET.parse(scenario.routes).getroot().findall("vehicle")]
            self.assertEqual(departures, sorted(departures))


if __name__ == "__main__":
    unittest.main()
