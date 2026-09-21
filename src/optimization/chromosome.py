"""Chromosome construction, validation, and genetic operators."""
import copy
import random
import networkx as nx
from config.settings import START_TIME, END_TIME
from data.graph import calculate_cycle_time
from optimization.context import RouteContext
def normalize_path(path: list[str]) -> tuple:
    reverse_path = list(reversed(path))
    return min(tuple(path), tuple(reverse_path))
def is_valid_route(path: list[str], graph: nx.DiGraph) -> bool:
    if len(path) < 5:
        return False
    if len(path) != len(set(path)):
        return False
    for i in range(len(path) - 1):
        if not graph.has_edge(path[i], path[i + 1]):
            return False
    return True
def route_overlap_penalty(candidate_path: list[str], solution: list[dict], hub_stops: set[str]) -> float:
    penalty = 0.0
    candidate_set = set(candidate_path)
    for route in solution:
        overlap = candidate_set & set(route["path"])
        for stop in overlap:
            penalty += 0.2 if stop in hub_stops else 1.0
    return penalty
def generate_random_route(
    stops: list[str],
    graph: nx.DiGraph,
    min_len: int = 4,
    max_len: int = 8,
) -> list[str]:
    length = random.randint(min_len, max_len)
    path = [random.choice(stops)]
    while len(path) < length:
        current = path[-1]
        neighbors = list(graph.neighbors(current))
        if not neighbors:
            break
        if random.random() < 0.7:
            valid = [n for n in neighbors if n not in path]
            next_stop = random.choice(valid) if valid else random.choice(neighbors)
        else:
            next_stop = random.choice(neighbors)
        path.append(next_stop)
    return path
def create_gene(stops: list[str], graph: nx.DiGraph) -> dict:
    path = generate_random_route(stops, graph)
    cycle_time = calculate_cycle_time(path, graph)
    num_bus = random.randint(1, 5)
    start = random.randint(START_TIME, START_TIME + 120)
    end = random.randint(start + cycle_time, END_TIME)
    return {
        "path": path,
        "num_bus": num_bus,
        "cycle_time": cycle_time,
        "headway": round(cycle_time / num_bus, 2),
        "startTime": start,
        "endTime": end,
    }
def random_chromosome(ctx: RouteContext) -> list[dict]:
    chromosome = []
    used_paths: set[tuple] = set()
    while len(chromosome) < ctx.num_routes:
        best_path = None
        best_score = float("inf")
        for _ in range(20):
            path = generate_random_route(ctx.stops, ctx.graph)
            if not is_valid_route(path, ctx.graph):
                continue
            path_tuple = normalize_path(path)
            if path_tuple in used_paths:
                continue
            cycle_time = calculate_cycle_time(path, ctx.graph)
            if cycle_time <= 0:
                continue
            overlap = route_overlap_penalty(path, chromosome, ctx.hub_stops)
            coverage_reward = len(set(path))
            score = overlap - coverage_reward * 0.3
            if score < best_score:
                best_score = score
                best_path = path
        if best_path is None:
            continue
        used_paths.add(tuple(best_path))
        cycle_time = calculate_cycle_time(best_path, ctx.graph)
        num_bus = random.randint(ctx.min_per_route, ctx.max_per_route)
        start_time = random.randint(ctx.start_time, ctx.start_time + 120)
        end_time = random.randint(start_time + cycle_time + 5, ctx.end_time)
        chromosome.append({
            "path": best_path,
            "num_bus": num_bus,
            "cycle_time": cycle_time,
            "headway": round(cycle_time / num_bus, 2),
            "startTime": start_time,
            "endTime": end_time,
        })
    return chromosome
def repair(chromosome: list[dict], ctx: RouteContext) -> list[dict]:
    repaired = []
    used_paths: set[tuple] = set()
    for gene in chromosome:
        path = gene["path"]
        if not is_valid_route(path, ctx.graph):
            continue
        path_tuple = normalize_path(path)
        if path_tuple in used_paths:
            continue
        used_paths.add(path_tuple)
        cycle_time = calculate_cycle_time(path, ctx.graph)
        num_bus = max(ctx.min_per_route, min(ctx.max_per_route, gene["num_bus"]))
        start = max(ctx.start_time, gene["startTime"])
        end = min(ctx.end_time, gene["endTime"])
        if end <= start + cycle_time:
            end = start + cycle_time + 5
        if end > ctx.end_time:
            continue
        repaired.append({
            "path": path,
            "num_bus": num_bus,
            "cycle_time": cycle_time,
            "headway": round(cycle_time / num_bus, 2),
            "startTime": start,
            "endTime": end,
    })
    while len(repaired) < ctx.num_routes:
        path = generate_random_route(ctx.stops, ctx.graph)
        if not is_valid_route(path, ctx.graph):
            continue
        path_tuple = normalize_path(path)
        if path_tuple in used_paths:
            continue
        used_paths.add(path_tuple)
        cycle_time = calculate_cycle_time(path, ctx.graph)
        num_bus = random.randint(ctx.min_per_route, ctx.max_per_route)
        repaired.append({
            "path": path,
            "num_bus": num_bus,
            "cycle_time": cycle_time,
            "headway": round(cycle_time / num_bus, 2),
            "startTime": random.randint(ctx.start_time, ctx.start_time + 120),
            "endTime": ctx.end_time,
        })
    return repaired[:ctx.num_routes]
def crossover(parent1: list[dict], parent2: list[dict], ctx: RouteContext) -> list[dict]:
    combined = parent1 + parent2
    random.shuffle(combined)
    child = []
    used_paths: set[tuple] = set()
    for gene in combined:
        path = gene["path"]
        if not is_valid_route(path, ctx.graph):
            continue
        path_tuple = normalize_path(path)
        if path_tuple in used_paths:
            continue
        used_paths.add(path_tuple)
        child.append(copy.deepcopy(gene))
        if len(child) >= ctx.num_routes:
            break
    return repair(child, ctx)
def mutation(chromosome: list[dict], mutation_rate: float, ctx: RouteContext) -> list[dict]:
    child = copy.deepcopy(chromosome)
    if random.random() > mutation_rate:
        return child
    idx = random.randint(0, len(child) - 1)
    move_type = random.choice(["route", "bus", "time", "replace_stop"])
    if move_type == "route":
        best_path = None
        best_score = float("inf")
        for _ in range(15):
            candidate = generate_random_route(ctx.stops, ctx.graph)
            if not is_valid_route(candidate, ctx.graph):
                continue
            overlap = route_overlap_penalty(candidate, child, ctx.hub_stops)
            coverage_reward = len(set(candidate))
            score = overlap - coverage_reward * 0.3
            if score < best_score:
                best_score = score
                best_path = candidate
        if best_path is not None:
            cycle_time = calculate_cycle_time(best_path, ctx.graph)
            num_bus = child[idx]["num_bus"]
            child[idx]["path"] = best_path
            child[idx]["cycle_time"] = cycle_time
            child[idx]["headway"] = round(cycle_time / num_bus, 2)
    elif move_type == "bus":
        child[idx]["num_bus"] = random.randint(ctx.min_per_route, ctx.max_per_route)
        cycle_time = child[idx]["cycle_time"]
        num_bus = child[idx]["num_bus"]
        child[idx]["headway"] = round(cycle_time / num_bus, 2)
    elif move_type == "time":
        child[idx]["startTime"] += random.randint(-20, 20)
    elif move_type == "replace_stop":
        path = child[idx]["path"]
        if len(path) > 4:
            replace_idx = random.randint(1, len(path) - 2)
            prev_stop = path[replace_idx - 1]
            neighbors = list(ctx.graph.neighbors(prev_stop))
            random.shuffle(neighbors)
            for candidate in neighbors:
                if candidate in path:
                    continue
                new_path = path.copy()
                new_path[replace_idx] = candidate
                if is_valid_route(new_path, ctx.graph):
                    child[idx]["path"] = new_path
                    break
    return repair(child, ctx)
def tournament_selection(population: list[list[dict]], scores: list[float], k: int = 3) -> list[dict]:
    selected = random.sample(list(zip(population, scores)), k)
    selected.sort(key=lambda item: item[1])
    return selected[0][0]
def attach_route_details(solution: list[dict], candidate_routes: list[dict], graph: nx.DiGraph) -> list[dict]:
    final_solution = []
    for item in solution:
        route_id = item["route_id"]
        num_bus = item["num_bus"]
        route_data = next((route.copy() for route in candidate_routes if route["route_id"] == route_id), None)
        if route_data is None:
            continue
        route_data["num_bus"] = num_bus
        cycle_time = calculate_cycle_time(route_data["path"], graph)
        route_data["cycle_time"] = cycle_time
        route_data["headway"] = round(cycle_time / num_bus, 2) if num_bus > 0 else float("inf")
        final_solution.append(route_data)
    return final_solution