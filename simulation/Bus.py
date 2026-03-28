route_special = ["Dorm", "Green", "SC2_SC3", "Health", "Lecture", "Dorm"]
route_red = ["Convention", "Terminal", "SC2_SC3", "Library", "Dorm", "Convention"]
route_yellow = ["Convention", "Dorm", "Library", "SC2_SC3", "Terminal", "Convention"]
route_purple = ["Dome", "Gate1", "SC1", "Library", "Green", "Dorm"]
route_blue = ["Convention", "Social", "Lecture", "Park", "Health", "Hospital"]
route_green = ["Convention", "Hospital", "Health", "Park", "Lecture", "Convention"]

class Bus:
    def __init__(self, id, capacity, route):
        self.id = id
        self.capacity = capacity
        self.route = route
        self.current_index = 0   # อยู่ป้ายไหน
        self.passengers = []

buses = [
    Bus(0, 30, route_special),
    Bus(1, 30, route_red),
    Bus(2, 30, route_yellow),
    Bus(3, 30, route_purple),
    Bus(4, 30, route_blue),
    Bus(5, 30, route_green),
]