"""Discrete-event bus-passenger simulation engine."""
import random

from .Bus import Bus
from .Passenger import Passenger
def run_simulation(
    active_routes: list[dict],
    stops: list[str],
    simulation_time: int = 60,
    bus_capacity: int = 30,
) -> dict:
    """Simulate passenger waiting/travel times for a set of active routes."""
    queues = {stop: [] for stop in stops}
    waiting_times: list[float] = []
    travel_times: list[float] = []
    buses: list[Bus] = []
    bus_id = 0
    for route_info in active_routes:
        route_path = route_info["path"]
        num_bus = route_info.get("num_bus", 5)
        start_time = route_info["startTime"]
        headway = route_info["headway"]
        travel_time = route_info.get("cycle_time", len(route_path) - 1) / max(1, len(route_path) - 1)
        for i in range(num_bus):
            buses.append(
                Bus(
                    bus_id=bus_id,
                    capacity=bus_capacity,
                    route=route_path,
                    headway=headway,
                    next_depart_time=start_time + (i * headway),
                    end_time=route_info["endTime"],
                    travel_time=travel_time,
                )
            )
            bus_id += 1
    first_service = min((route["startTime"] for route in active_routes), default=0)
    last_service = max((route["endTime"] for route in active_routes), default=0)

    def generate_passengers(t: int) -> None:
        if not first_service <= t <= last_service:
            return
        hour = t / 60
        demand_prob = 0.8 if 7.5 <= hour < 10 or 11.5 <= hour < 13.5 else 0.25
        if random.random() >= demand_prob:
            return
        origin = random.choice(stops)
        destination = random.choice(stops)
        while destination == origin:
            destination = random.choice(stops)
        queues[origin].append(
            Passenger(origin=origin, destination=destination, arrival_time=t)
        )
    def move_bus(bus: Bus, t: int) -> bool:
        if t < bus.next_depart_time or t > bus.endTime:
            return False
        if bus.started:
            bus.current_index = (bus.current_index + 1) % len(bus.route)
        else:
            bus.started = True
        bus.next_depart_time += bus.travel_time
        return True
    def drop_passengers(bus: Bus, t: int) -> None:
        current_stop = bus.route[bus.current_index]
        remaining = []
        for passenger in bus.passengers:
            if passenger.destination == current_stop:
                passenger.drop_time = t
                if passenger.board_time is not None:
                    travel_times.append(t - passenger.board_time)
            else:
                remaining.append(passenger)
        bus.passengers = remaining
    def board_passengers(bus: Bus, t: int) -> None:
        current_stop = bus.route[bus.current_index]
        if current_stop not in queues:
            return
        remaining_queue = []
        for passenger in queues[current_stop]:
            if len(bus.passengers) < bus.capacity and passenger.destination in bus.route:
                passenger.board_time = t
                bus.passengers.append(passenger)
                waiting_times.append(t - passenger.arrival_time)
            else:
                remaining_queue.append(passenger)
        queues[current_stop] = remaining_queue
    for t in range(simulation_time):
        generate_passengers(t)
        for bus in buses:
            if move_bus(bus, t):
                drop_passengers(bus, t)
                board_passengers(bus, t)
    avg_wait = sum(waiting_times) / len(waiting_times) if waiting_times else 0.0
    avg_travel = sum(travel_times) / len(travel_times) if travel_times else 0.0
    return {
        "avg_wait_time": round(avg_wait, 2),
        "avg_travel_time": round(avg_travel, 2),
        "served_passengers": len(travel_times),
        "waiting_passengers": sum(len(queue) for queue in queues.values()),
    }
