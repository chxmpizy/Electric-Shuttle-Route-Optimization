"""Heatmap visualizations for route usage."""
from collections import defaultdict
import matplotlib.pyplot as plt
import networkx as nx
def draw_node_usage_heatmap(
    graph: nx.DiGraph,
    solution: list[dict],
    title: str = "Node Usage Heatmap",
) -> None:
    usage = defaultdict(int)
    for route in solution:
        for stop in route["path"]:
            usage[stop] += 1
    plt.figure(figsize=(14, 10))
    pos = nx.spring_layout(graph, seed=42)
    node_sizes = []
    node_colors = []
    for node in graph.nodes():
        count = usage[node]
        node_sizes.append(800 + count * 400)
        node_colors.append(count)
    nx.draw_networkx_edges(graph, pos, alpha=0.3)
    nodes = nx.draw_networkx_nodes(
        graph,
        pos,
        node_size=node_sizes,
        node_color=node_colors,
        cmap=plt.cm.Reds,
    )
    nx.draw_networkx_labels(graph, pos, font_size=9)
    plt.colorbar(nodes)
    plt.title(title)
    plt.axis("off")
    plt.show()
def draw_edge_overlap_heatmap(
    graph: nx.DiGraph,
    solution: list[dict],
    title: str = "Edge Overlap Heatmap",
) -> None:
    edge_usage = defaultdict(int)
    for route in solution:
        path = route["path"]
        for i in range(len(path) - 1):
            edge = tuple(sorted((path[i], path[i + 1])))
            edge_usage[edge] += 1
    plt.figure(figsize=(14, 10))
    pos = nx.spring_layout(graph, seed=42)
    nx.draw_networkx_nodes(graph, pos, node_size=1000)
    nx.draw_networkx_labels(graph, pos, font_size=9)
    widths = []
    colors = []
    edges = []
    for edge in graph.edges():
        key = tuple(sorted(edge))
        count = edge_usage.get(key, 0)
        edges.append(edge)
        widths.append(1 + count * 2)
        colors.append(count)
    nx.draw_networkx_edges(
        graph,
        pos,
        edgelist=edges,
        width=widths,
        edge_color=colors,
        edge_cmap=plt.cm.OrRd,
    )
    plt.title(title)
    plt.axis("off")
    plt.show()