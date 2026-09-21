class Passenger:
    """A passenger moving through the discrete-event shuttle simulation."""

    def __init__(self, origin: str, destination: str, arrival_time: int):
        self.origin = origin
        self.destination = destination
        self.arrival_time = arrival_time
        self.board_time: int | None = None
        self.drop_time: int | None = None
