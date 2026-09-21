"""Particle Swarm Optimization for fleet scheduling on fixed routes."""
import random
from config.settings import PSO_C1, PSO_C2, PSO_MAX_ITER, PSO_NUM_PARTICLES, PSO_W
from data.graph import calculate_cycle_time
from optimization.chromosome import repair
from optimization.context import RouteContext
from optimization.evaluator import evaluate
class Particle:
    def __init__(self, num_routes: int, ctx: RouteContext):
        dim = num_routes * 2
        self.position = []
        for i in range(dim):
            if i % 2 == 0:
                self.position.append(random.uniform(ctx.min_per_route, ctx.max_per_route))
            else:
                self.position.append(random.uniform(ctx.start_time, ctx.start_time + 120))
        self.velocity = []
        for i in range(dim):
            if i % 2 == 0:
                self.velocity.append(random.uniform(-2, 2))
            else:
                self.velocity.append(random.uniform(-30, 30))
        self.best_position = self.position.copy()
        self.best_score = float("inf")
def discretize(position: list[float], fixed_routes: list[dict], ctx: RouteContext) -> list[dict]:
    solution = []
    for i, route in enumerate(fixed_routes):
        num_bus = round(position[i * 2])
        num_bus = max(ctx.min_per_route, min(ctx.max_per_route, num_bus))
        start_time = round(position[i * 2 + 1])
        base_start = route["startTime"]
        base_end = route["endTime"]
        start_time = max(base_start, min(base_start + 60, start_time))
        cycle_time = calculate_cycle_time(route["path"], ctx.graph)
        end_time = max(start_time + cycle_time + 5, base_end)
        end_time = min(ctx.end_time, end_time)
        headway = round(cycle_time / num_bus, 2)
        solution.append({
            "route_id": route["route_id"],
            "path": route["path"],
            "num_bus": num_bus,
            "cycle_time": cycle_time,
            "headway": headway,
            "startTime": start_time,
            "endTime": end_time,
        })
    total_bus = sum(route["num_bus"] for route in solution)
    while total_bus > ctx.total_buses:
        idx = random.randint(0, len(solution) - 1)
        if solution[idx]["num_bus"] > ctx.min_per_route:
            solution[idx]["num_bus"] -= 1
            total_bus -= 1
            cycle_time = solution[idx]["cycle_time"]
            num_bus = solution[idx]["num_bus"]
            solution[idx]["headway"] = round(cycle_time / num_bus, 2)
    return repair(solution, ctx)
def run_pso(
    fixed_routes: list[dict],
    ctx: RouteContext,
    num_particles: int = PSO_NUM_PARTICLES,
    max_iter: int = PSO_MAX_ITER,
    w: float = PSO_W,
    c1: float = PSO_C1,
    c2: float = PSO_C2,
) -> tuple[list[dict], float, list[float]]:
    num_routes = len(fixed_routes)
    dim = num_routes * 2
    particles = [Particle(num_routes, ctx) for _ in range(num_particles)]
    global_best = particles[0].position.copy()
    global_best_score = float("inf")
    history: list[float] = []
    v_max_bus = 2
    v_max_time = 30
    for it in range(max_iter):
        for particle in particles:
            discrete_sol = discretize(particle.position, fixed_routes, ctx)
            score = evaluate(discrete_sol, ctx)
            if score < particle.best_score:
                particle.best_score = score
                particle.best_position = particle.position.copy()
            if score < global_best_score:
                global_best_score = score
                global_best = particle.position.copy()
        for particle in particles:
            for i in range(dim):
                r1 = random.random()
                r2 = random.random()
                cognitive = c1 * r1 * (particle.best_position[i] - particle.position[i])
                social = c2 * r2 * (global_best[i] - particle.position[i])
                particle.velocity[i] = w * particle.velocity[i] + cognitive + social
                if i % 2 == 0:
                    particle.velocity[i] = max(-v_max_bus, min(v_max_bus, particle.velocity[i]))
                else:
                    particle.velocity[i] = max(-v_max_time, min(v_max_time, particle.velocity[i]))
                particle.position[i] += particle.velocity[i]
                if i % 2 == 0:
                    particle.position[i] = max(
                        ctx.min_per_route,
                        min(ctx.max_per_route, particle.position[i]),
                    )
                else:
                    particle.position[i] = max(
                        ctx.start_time,
                        min(ctx.end_time, particle.position[i]),
                    )
        history.append(global_best_score)
        print(f"Iter {it} | Best Score: {global_best_score:.3f}")
    best_solution = discretize(global_best, fixed_routes, ctx)
    return best_solution, global_best_score, history