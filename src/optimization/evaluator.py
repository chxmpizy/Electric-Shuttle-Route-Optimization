"""Evaluate a chromosome by running simulation and applying penalties."""
from optimization.context import RouteContext
from optimization.fitness import fitness
from simulation.engine import run_simulation
def evaluate(chromosome: list[dict], ctx: RouteContext, runs: int = 1) -> float:
    scores = []
    for _ in range(runs):
        active_routes = [
            {
                "path": gene["path"],
                "num_bus": gene["num_bus"],
                "cycle_time": gene["cycle_time"],
                "headway": gene["headway"],
                "startTime": gene["startTime"],
                "endTime": gene["endTime"],
            }
            for gene in chromosome
        ]
        simulation_time = max(gene["endTime"] for gene in chromosome)
        result = run_simulation(active_routes, ctx.stops, simulation_time)
        base_score = fitness(result)
        served = set()
        for gene in chromosome:
            served.update(gene["path"])
        coverage = len(served) / len(ctx.stops)
        coverage_penalty = (0.8 - coverage) * 10 if coverage < 0.8 else 0.0
        stop_count: dict[str, int] = {}
        for route in chromosome:
            for stop in route["path"]:
                stop_count[stop] = stop_count.get(stop, 0) + 1
        overlap_penalty = 0.0
        for stop, count in stop_count.items():
            allowed_overlap = 4 if stop in ctx.hub_stops else 2
            if count > allowed_overlap:
                overlap_penalty += (count - allowed_overlap) * 0.5
        route_length_penalty = sum(
            1 for route in chromosome if len(route["path"]) < 5
        )
        total_bus = sum(route["num_bus"] for route in chromosome)
        bus_penalty = (total_bus - ctx.total_buses) * 2 if total_bus > ctx.total_buses else 0.0
        final_score = (
            base_score
            + coverage_penalty
            + overlap_penalty
            + route_length_penalty
            + bus_penalty
        )
        scores.append(final_score)
    return sum(scores) / len(scores)
