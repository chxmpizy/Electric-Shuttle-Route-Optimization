"""Simulated Annealing for campus route optimization."""
import copy
import math
import random
from config.settings import SA_COOLING_RATE, SA_MAX_ITER, SA_T_INIT
from data.graph import calculate_cycle_time
from optimization.chromosome import generate_random_route, is_valid_route, random_chromosome, repair
from optimization.context import RouteContext
from optimization.evaluator import evaluate
def neighbor(solution: list[dict], ctx: RouteContext) -> list[dict]:
    new_sol = copy.deepcopy(solution)
    if not new_sol:
        return new_sol
    idx = random.randint(0, len(new_sol) - 1)
    move_type = random.choice(["route", "bus", "time"])
    if move_type == "route":
        new_path = None
        for _ in range(10):
            candidate = generate_random_route(ctx.stops, ctx.graph)
            if len(candidate) < 2 or len(candidate) != len(set(candidate)):
                continue
            if all(ctx.graph.has_edge(candidate[i], candidate[i + 1]) for i in range(len(candidate) - 1)):
                new_path = candidate
                break
        if new_path is None or len(new_path) < 2:
            return new_sol
        cycle_time = calculate_cycle_time(new_path, ctx.graph)
        num_bus = new_sol[idx]["num_bus"]
        new_sol[idx].update({
            "path": new_path,
            "cycle_time": cycle_time,
            "headway": round(cycle_time / num_bus, 2),
        })
    elif move_type == "bus":
        candidates_from = [
            i for i in range(len(new_sol))
            if new_sol[i]["num_bus"] > ctx.min_per_route
        ]
        candidates_to = [
            i for i in range(len(new_sol))
            if new_sol[i]["num_bus"] < ctx.max_per_route
        ]
        if candidates_from and candidates_to:
            i = random.choice(candidates_from)
            j = random.choice(candidates_to)
            if i != j:
                new_sol[i]["num_bus"] -= 1
                new_sol[j]["num_bus"] += 1
                for k in (i, j):
                    cycle_time = new_sol[k]["cycle_time"]
                    num_bus = new_sol[k]["num_bus"]
                    new_sol[k]["headway"] = round(cycle_time / num_bus, 2)
    elif move_type == "time":
        shift = random.randint(-10, 10)
        new_start = max(ctx.start_time, min(ctx.end_time, new_sol[idx]["startTime"] + shift))
        cycle_time = new_sol[idx]["cycle_time"]
        if new_sol[idx]["endTime"] <= new_start + cycle_time:
            new_sol[idx]["endTime"] = new_start + cycle_time + 5
        new_sol[idx]["startTime"] = new_start
    return repair(new_sol, ctx)
def accept(old_score: float, new_score: float, temperature: float) -> bool:
    if new_score < old_score:
        return True
    delta = old_score - new_score
    try:
        prob = math.exp(delta / temperature)
    except OverflowError:
        prob = 0.0
    return random.random() < prob
def run_sa(
    ctx: RouteContext,
    max_iter: int = SA_MAX_ITER,
    t_init: float = SA_T_INIT,
    cooling_rate: float = SA_COOLING_RATE,
) -> tuple[list[dict], float, list[float]]:
    current = random_chromosome(ctx)
    current_score = evaluate(current, ctx)
    best = copy.deepcopy(current)
    best_score = current_score
    temperature = t_init
    history: list[float] = []
    for i in range(max_iter):
        new_sol = neighbor(current, ctx)
        new_score = evaluate(new_sol, ctx)
        if accept(current_score, new_score, temperature):
            current = new_sol
            current_score = new_score
        if current_score < best_score:
            best = copy.deepcopy(current)
            best_score = current_score
        history.append(best_score)
        print(f"Iter {i} | Best Score: {best_score:.2f} | T={temperature:.2f}")
        temperature *= cooling_rate
        if temperature < 0.001:
            break
    return best, best_score, history