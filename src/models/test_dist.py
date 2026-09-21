import sumolib
net = sumolib.net.readNet("src/models/sumo_output/thammasat.net.xml")
edges = net.getNeighboringEdges(1000, 800, r=5000)
print(edges[0][1])
