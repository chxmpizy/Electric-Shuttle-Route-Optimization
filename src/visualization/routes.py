"""Route graph visualization."""
import matplotlib.pyplot as plt
import networkx as nx
def draw_base_graph(graph: nx.DiGraph, title: str = "Campus Transit Graph") -> None:
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(graph, seed=42)
    nx.draw_networkx_nodes(graph, pos, node_size=1200)
    nx.draw_networkx_edges(graph, pos, width=2)
    nx.draw_networkx_labels(graph, pos, font_size=9)
    plt.title(title)
    plt.axis("off")
    plt.show()
def draw_solution(
    graph: nx.DiGraph,
    solution: list[dict],
    title: str = "Transit Routes",
) -> None:
    plt.figure(figsize=(14, 10))
    pos = nx.spring_layout(graph, seed=42)
    nx.draw_networkx_nodes(graph, pos, node_size=1000, alpha=0.9)
    nx.draw_networkx_labels(graph, pos, font_size=9)
    nx.draw_networkx_edges(graph, pos, alpha=0.2, width=1)
    colors = [
        "red", "blue", "green", "orange", "purple",
        "brown", "pink", "gray", "olive", "cyan",
    ]
    for idx, route in enumerate(solution):
        color = colors[idx % len(colors)]
        path = route["path"]
        edge_list = [(path[i], path[i + 1]) for i in range(len(path) - 1)]
        nx.draw_networkx_edges(
            graph,
            pos,
            edgelist=edge_list,
            width=4,
            edge_color=color,
            alpha=0.9,
        )
        first_node = path[0]
        x, y = pos[first_node]
        plt.text(x, y + 0.03, f"R{idx + 1}", fontsize=10, color=color, weight="bold")
    plt.title(title)
    plt.axis("off")
    plt.show()