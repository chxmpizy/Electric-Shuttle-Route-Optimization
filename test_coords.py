import sumolib

net = sumolib.net.readNet("src/models/sumo_output/thammasat.net.xml")

stops = {
    "Dome": (100.59560, 14.07542),
    "Hospital": (100.61500, 14.07720),
    "Dorm": (100.60000, 14.06700),
    "Gate1": (100.60750, 14.06650),
    "Library": (100.60150, 14.07130),
    "Park": (100.60200, 14.07250),
    "SC1": (100.60500, 14.07200),
    "SC2_SC3": (100.60400, 14.07000),
    "Green": (100.59800, 14.06900),
    "Convention": (100.60100, 14.06800),
    "Terminal": (100.60700, 14.06900),
    "Lecture": (100.60450, 14.07300),
    "Health": (100.61300, 14.07600),
    "Social": (100.59900, 14.07400),
}

for stop, (lon, lat) in stops.items():
    x, y = net.convertLonLat2XY(lon, lat)
    edges = net.getNeighboringEdges(x, y, 200)
    if not edges:
        print(f"FAILED to find edges for {stop}")
    else:
        # filter for bus
        valid = [e for e, dist in edges if e.allows("bus")]
        if valid:
            print(f"{stop:15s}: OK - nearest bus edge {valid[0].getID()}")
        else:
            print(f"{stop:15s}: NO BUS EDGE nearby")
