"""Genetic Algorithm for campus route optimization."""
import copy
import random
from config.settings import CROSSOVER_RATE, ELITE_SIZE, GENERATIONS, MUTATION_RATE, POPULATION_SIZE
from optimization.chromosome import crossover, mutation, random_chromosome
from optimization.context import RouteContext
from optimization.evaluator import evaluate
def run_ga(
    ctx: RouteContext,
    population_size: int = POPULATION_SIZE,
    generations: int = GENERATIONS,
    mutation_rate: float = MUTATION_RATE,
    crossover_rate: float = CROSSOVER_RATE,
    elite_size: int = ELITE_SIZE,
) -> tuple[list[dict], float, list[float]]:
    population = [random_chromosome(ctx) for _ in range(population_size)]
    best_solution = None
    best_score = float("inf")
    history: list[float] = []
    for gen in range(generations):
        scores = [evaluate(ind, ctx) for ind in population]
        for i, score in enumerate(scores):
            if score < best_score:
                best_score = score
                best_solution = population[i]
        history.append(best_score)
        def select() -> list[dict]:
            i, j = random.sample(range(len(population)), 2)
            return population[i] if scores[i] < scores[j] else population[j]
        new_population = []
        elite_idx = sorted(range(len(scores)), key=lambda i: scores[i])[:elite_size]
        for i in elite_idx:
            new_population.append(population[i])
        while len(new_population) < population_size:
            parent1 = select()
            parent2 = select()
            if random.random() < crossover_rate:
                child = crossover(parent1, parent2, ctx)
            else:
                child = copy.deepcopy(parent1)
            child = mutation(child, mutation_rate, ctx)
            new_population.append(child)
        population = new_population
        print(f"Gen {gen} | Best: {best_score:.3f}")
    return best_solution, best_score, history