"""Global configuration and constants for route optimization."""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_RAW_DIR = PROJECT_ROOT / "data" / "raw"
ROUTE_CSV = DATA_RAW_DIR / "route.csv"

# Simulation time window (minutes from midnight)
START_TIME = 360   # 06:00
END_TIME = 1260    # 21:00

# Fleet constraints
TOTAL_BUSES = 30 # Increased to match simulation total buses in prompt
MIN_ROUTE_BUS = [1, 1, 1, 1, 1, 1]
MAX_PER_ROUTE = 8
MIN_PER_ROUTE = 1

NUM_ROUTES = 6
SELECTED_ROUTES = 6

# Genetic Algorithm defaults
POPULATION_SIZE = 30
ELITE_SIZE = 2
CROSSOVER_RATE = 0.85
MUTATION_RATE = 0.2
GENERATIONS = 30

# Simulated Annealing defaults
SA_MAX_ITER = 300
SA_T_INIT = 100.0
SA_COOLING_RATE = 0.95

# PSO defaults
PSO_NUM_PARTICLES = 30
PSO_MAX_ITER = 50
PSO_W = 0.9
PSO_C1 = 2.0
PSO_C2 = 2.0

# ACO defaults
ACO_NUM_ANTS = 30
ACO_ITERATIONS = 50
ACO_ALPHA = 1.0
ACO_BETA = 2.0
ACO_EVAPORATION = 0.1

# Experiment runs
DEFAULT_EVAL_RUNS = 1 # Set to 1 for deterministic evaluation efficiency
DEFAULT_TRIALS = 5

# Random seed
RANDOM_SEED = 42
