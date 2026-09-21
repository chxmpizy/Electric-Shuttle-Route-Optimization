import osmnx as ox
import matplotlib.pylab as plt
ox.settings.use_cache = False      # 🔥 ปิด cache
ox.settings.all_oneway = True      # 🔥 แก้ warning

G = ox.graph_from_place(
    "Thammasat University Rangsit Campus, Thailand",
    network_type='drive',
    simplify=False   # 🔥 ต้องมี
)

ox.plot_graph(G)
ox.save_graph_xml(G, filepath='map.osm.xml')
plt.show()