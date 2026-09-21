"""Algorithm comparison and convergence plots."""
import matplotlib.pyplot as plt
import networkx as nx
from visualization.routes import draw_solution
def compare_result(before_score: float, after_score: float) -> None:
    print("===== BEFORE =====")
    print(f"Score: {round(before_score, 3)}")
    print("\n===== AFTER =====")
    print(f"Score: {round(after_score, 3)}")
    print("\n===== IMPROVEMENT =====")
    improvement = ((before_score - after_score) / before_score) * 100 if before_score else 0.0
    print(f"Score Improve: {round(improvement, 2)}%")
def compare_algorithms(
    graph: nx.DiGraph,
    ga_sol: list[dict],
    sa_sol: list[dict],
    pso_sol: list[dict],
    aco_sol: list[dict],
) -> None:
    draw_solution(graph, ga_sol, title="GA Solution")
    draw_solution(graph, sa_sol, title="SA Solution")
    draw_solution(graph, pso_sol, title="PSO Solution")
    draw_solution(graph, aco_sol, title="ACO Solution")
def plot_algorithm_history(
    histories: dict[str, list[float]],
    title: str = "Comparison of Heuristic Algorithms",
) -> None:
    plt.figure(figsize=(10, 6))
    for label, history in histories.items():
        plt.plot(history, label=label)
    plt.xlabel("Iteration / Generation")
    plt.ylabel("Objective Score")
    plt.title(title)
    plt.legend()
    plt.grid(True)
    plt.show()