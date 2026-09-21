class Bus:
    def __init__(
        self,
        bus_id: int,
        capacity: int,
        route: list[str],
        next_depart_time: int,
        headway: float,
        end_time: int,
        travel_time: float = 1.0,
    ):
        self.id = bus_id
        self.capacity = capacity
        self.route = route
        self.next_depart_time = next_depart_time
        self.headway = headway
        self.endTime = end_time
        self.travel_time = max(1.0, travel_time)
        self.current_index = 0
        self.started = False
        self.passengers: list["Passenger"] = []
