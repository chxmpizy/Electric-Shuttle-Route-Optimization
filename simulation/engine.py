import random
from simulation import Passenger
from simulation import queues
from simulation import Bus,buses

def generate_passengers(current_time):
    if random.random() < 0.5:  

        origin = random.choice(stops)
        destination = random.choice(stops)

        # ❗ ห้าม origin == destination
        while destination == origin:
            destination = random.choice(stops)

        p = Passenger(origin, destination, current_time)
        queues[origin].append(p)

def move_bus(bus):
    bus.current_index += 1
    if bus.current_index >= len(bus.route):
        bus.current_index = 0

def board_passengers(bus,t):
    current_stop = bus.route[bus.current_index]
    queue = queues[current_stop]

    while queue and len(bus.passengers) < bus.capacity:
        p = queue.pop(0)
        bus.passengers.append(p)

        print("Passenger boarded:", p.origin, "→", p.destination)
        waiting_time = t - p.arrival_time
        waiting_times.append(waiting_time)

def drop_passengers(bus):
    current_stop = bus.route[bus.current_index]
    bus.passengers = [
        p for p in bus.passengers if p.destination != current_stop
    ]

simulation_time = 60

for t in range(simulation_time):
    
    generate_passengers(t)

    for bus in buses:
        move_bus(bus)
        drop_passengers(bus)
        board_passengers(bus,t)