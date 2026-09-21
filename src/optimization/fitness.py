"""Objective function for simulation-based route evaluation."""
def fitness(result: dict) -> float:
    """Lower score is better."""
    if result["avg_wait_time"] == 0.0 or result["avg_travel_time"] == 0.0:
        return 9999.0
    norm_wait = result["avg_wait_time"] / 10
    norm_travel = result["avg_travel_time"] / 10
    return 0.5 * norm_wait + 0.5 * norm_travel