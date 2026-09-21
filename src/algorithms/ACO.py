"""Ant Colony Optimization for campus route optimization."""
import random
from config.settings import ACO_ALPHA, ACO_BETA, ACO_EVAPORATION, ACO_ITERATIONS, ACO_NUM_ANTS
from data.graph import calculate_cycle_time
from optimization.chromosome import (
    generate_random_route,
    is_valid_route,
    normalize_path,
    repair,
)
from optimization.context import RouteContext
from optimization.evaluator import evaluate
def route_heuristic(path: list[str], graph, stops: list[str]) -> float:
    cycle_time = calculate_cycle_time(path, graph)
    coverage = len(set(path)) / len(stops)
    return coverage / (cycle_time + 1e-6)
def construct_solution(
    pheromone: dict,
    ctx: RouteContext,
    alpha: float = ACO_ALPHA,
    beta: float = ACO_BETA,
) -> list[dict]:
    solution = []
    used_paths: set[tuple] = set()
    while len(solution) < ctx.num_routes:
        path = generate_random_route(ctx.stops, ctx.graph)
        if len(path) < 2 or len(path) != len(set(path)):
            continue
        if not all(ctx.graph.has_edge(path[i], path[i + 1]) for i in range(len(path) - 1)):
            continue
        path_key = normalize_path(path)
        if path_key in used_paths:
            continue
        cycle_time = calculate_cycle_time(path, ctx.graph)
        if cycle_time <= 0:
            continue
        used_paths.add(path_key)
        num_bus = ctx.min_per_route
        start_time = random.randint(ctx.start_time, ctx.start_time + 120)
        min_end = start_time + cycle_time + 5
        end_time = random.randint(max(min_end, 1080), ctx.end_time)
        solution.append({
            "path": path,
            "num_bus": num_bus,
            "cycle_time": cycle_time,
            "headway": round(cycle_time / num_bus, 2),
            "startTime": start_time,
            "endTime": end_time,
        })
    remain = ctx.total_buses - ctx.num_routes * ctx.min_per_route
    for _ in range(remain):
        probs = []
        for route in solution:
            if route["num_bus"] >= ctx.max_per_route:
                probs.append(0.0)
                continue
            path_key = normalize_path(route["path"])
            tau = pheromone.get(path_key, 1.0)
            h = route_heuristic(route["path"], ctx.graph, ctx.stops)
            probs.append((tau ** alpha) * (h ** beta))
        total_prob = sum(probs)
        if total_prob == 0:
            break
        probs = [p / total_prob for p in probs]
        r = random.random()
        cumulative = 0.0
        for i, prob in enumerate(probs):
            cumulative += prob
            if r <= cumulative:
                route = solution[i]
                route["num_bus"] += 1
                route["headway"] = round(route["cycle_time"] / route["num_bus"], 2)
                break
    return repair(solution, ctx)
def update_pheromone(
    pheromone: dict,
    ants: list[list[dict]],
    scores: list[float],
    ctx: RouteContext,
    evaporation: float = ACO_EVAPORATION,
) -> dict:
    for key in list(pheromone.keys()):
        pheromone[key] *= (1 - evaporation)
        if pheromone[key] < 1e-6:
            del pheromone[key]
    for sol, score in zip(ants, scores):
        deposit = 1 / (score + 1e-6)
        for route in sol:
            path_key = normalize_path(route["path"])
            h = route_heuristic(route["path"], ctx.graph, ctx.stops)
            pheromone[path_key] = pheromone.get(path_key, 0.0) + deposit * h
    return pheromone
def run_aco(
    ctx: RouteContext,
    num_ants: int = ACO_NUM_ANTS,
    iterations: int = ACO_ITERATIONS,
    alpha: float = ACO_ALPHA,
    beta: float = ACO_BETA,
    evaporation: float = ACO_EVAPORATION,
) -> tuple[list[dict], float, list[float]]:
    pheromone: dict = {}
    best_solution = None
    best_score = float("inf")
    history: list[float] = []
    for it in range(iterations):
        ants = []
        scores = []
        for _ in range(num_ants):
            sol = construct_solution(pheromone, ctx, alpha=alpha, beta=beta)
            score = evaluate(sol, ctx, runs=3)
            ants.append(sol)
            scores.append(score)
            if score < best_score:
                best_score = score
                best_solution = sol
        pheromone = update_pheromone(pheromone, ants, scores, ctx, evaporation=evaporation)
        history.append(best_score)
        print(f"Iter {it} | Best Score: {best_score:.3f}")
    return best_solution, best_score, history