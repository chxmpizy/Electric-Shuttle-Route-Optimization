"""
src/simulation/engine.py
=========================
Discrete-Event Bus-Passenger Simulation Engine

การเปลี่ยนแปลงจากเวอร์ชันก่อน:
  1. รองรับ passenger_demand (list[PassengerDemand]) แทนการสุ่ม
  2. เวลาเดินทางระหว่างป้ายดึงจาก Network Graph จริง ไม่ใช่หารเฉลี่ย
  3. ผลลัพธ์รวมสถิติ on_time, late, stranded, delay_minutes
  4. บันทึก Event Log สำหรับ Monitor และ Mobility Visualization
"""
from __future__ import annotations
import random
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    import networkx as nx

from .Bus import Bus
from .Passenger import Passenger

# ─── Legacy STOP_WEIGHTS ใช้สำหรับ Random Mode เท่านั้น ────────────────────
STOP_WEIGHTS = {
    "Dome": 81, "Hospital": 200, "Dorm": 2500, "Gate1": 80,
    "Library": 846, "Park": 200, "SC1": 600, "SC2_SC3": 600,
    "Green": 100, "Convention": 150, "Terminal": 212,
    "Lecture": 1100, "Health": 1023, "Social": 1500,
}

DWELL_TIME_MIN: float = 1.5   # นาทีหยุดรับ-ส่งที่ป้าย
LAYOVER_TIME_MIN: float = 5.0  # นาทีพักปลายรอบ


def _get_segment_time(
    graph: "nx.DiGraph",
    from_stop: str,
    to_stop: str,
    fallback_min: float = 3.0,
) -> float:
    """
    ดึงเวลาเดินทาง (นาที) จาก Network Graph จริง
    ใช้ Edge Weight โดยตรง ไม่หารเฉลี่ย
    """
    try:
        return float(graph[from_stop][to_stop]["weight"])
    except (KeyError, TypeError):
        pass
    try:
        import networkx as nx
        return float(nx.shortest_path_length(graph, from_stop, to_stop, weight="weight"))
    except Exception:
        return fallback_min


def _build_segment_times(
    route_path: list[str],
    graph: Optional["nx.DiGraph"],
    cycle_time: float,
) -> list[float]:
    """
    สร้าง list ของเวลาเดินทางแต่ละช่วงใน route_path
    ถ้ามี graph ใช้ข้อมูลจริง ถ้าไม่มี fallback เป็นการหารเฉลี่ย
    """
    if graph is not None:
        times = []
        for i in range(len(route_path) - 1):
            times.append(_get_segment_time(graph, route_path[i], route_path[i + 1]))
        return times
    # Fallback: หารเฉลี่ย (legacy)
    n = max(1, len(route_path) - 1)
    avg = cycle_time / n
    return [avg] * n


def run_simulation(
    active_routes: list[dict],
    stops: list[str],
    simulation_time: int = 60,
    bus_capacity: int = 30,
    passenger_demands=None,   # list[PassengerDemand] | None
    graph=None,               # nx.DiGraph | None
    seed: Optional[int] = None,
) -> dict:
    """
    จำลองการเดินรถบัสและผู้โดยสาร

    Parameters
    ----------
    active_routes      : รายการ route dict จาก chromosome
    stops              : ป้ายทั้งหมดในระบบ
    simulation_time    : ระยะเวลาจำลอง (นาที, นับจาก t=0)
    bus_capacity       : ความจุรถ (ที่นั่ง)
    passenger_demands  : list[PassengerDemand] จาก timetable (None = สุ่ม)
    graph              : NetworkX DiGraph สำหรับคำนวณเวลาระหว่างป้าย
    seed               : Random seed สำหรับ reproducibility

    Returns
    -------
    dict ของสถิติการจำลอง รวมถึง on_time_rate, avg_delay, stranded_count
    """
    if seed is not None:
        random.seed(seed)

    # ─── 1. สร้างคิวผู้โดยสารแต่ละป้าย ────────────────────────────────────
    queues: dict[str, list[Passenger]] = {stop: [] for stop in stops}
    all_passengers: list[Passenger] = []

    if passenger_demands is not None:
        # โหมดตารางเรียน: แปลง PassengerDemand → Passenger
        for d in passenger_demands:
            if d.origin not in queues:
                queues[d.origin] = []
            p = Passenger(
                passenger_id=d.passenger_id,
                origin=d.origin,
                destination=d.destination,
                arrival_time=d.arrival_at_stop,
                class_start_time=d.class_start_time,
                walk_time_minutes=d.walk_time_minutes,
                arrive_before_min=15.0,
                course_code=d.course_code,
            )
            all_passengers.append(p)
    else:
        # โหมด Legacy: สุ่มผู้โดยสาร (ไว้ใช้ทดสอบและ Benchmark กับ Baseline)
        first_service = min((r["startTime"] for r in active_routes), default=0)
        last_service = max((r["endTime"] for r in active_routes), default=simulation_time)
        pid = 0
        for t in range(simulation_time):
            if not (first_service <= t <= last_service):
                continue
            hour = t / 60
            demand_prob = 0.8 if 7.5 <= hour < 10 or 11.5 <= hour < 13.5 else 0.25
            if random.random() >= demand_prob:
                continue
            wts = [STOP_WEIGHTS.get(s, 100) for s in stops]
            origin = random.choices(stops, weights=wts, k=1)[0]
            dest = random.choices(stops, weights=wts, k=1)[0]
            while dest == origin:
                dest = random.choices(stops, weights=wts, k=1)[0]
            p = Passenger(
                passenger_id=pid,
                origin=origin,
                destination=dest,
                arrival_time=float(t),
            )
            all_passengers.append(p)
            pid += 1

    # ใส่คิวตามเวลามาถึง (จะ enqueue ตอนครบเวลาใน loop)
    pending = sorted(all_passengers, key=lambda p: p.arrival_time)

    # ─── 2. สร้างรถบัสพร้อม segment times จากกราฟจริง ─────────────────────
    buses: list[Bus] = []
    bus_id = 0
    for route_info in active_routes:
        route_path = route_info["path"]
        num_bus = route_info.get("num_bus", 5)
        start_time = route_info["startTime"]
        headway = route_info["headway"]
        cycle_time = route_info.get("cycle_time", len(route_path) - 1)
        end_time = route_info["endTime"]

        seg_times = _build_segment_times(route_path, graph, cycle_time)

        for i in range(num_bus):
            buses.append(Bus(
                bus_id=bus_id,
                capacity=bus_capacity,
                route=route_path,
                headway=headway,
                next_depart_time=start_time + (i * headway),
                end_time=end_time,
                segment_times=seg_times,
            ))
            bus_id += 1

    # ─── 3. Event Log สำหรับ Monitor / Visualization ───────────────────────
    event_log: list[dict] = []

    # ─── 4. Simulation Loop ────────────────────────────────────────────────
    # ใช้ continuous-time แทน integer step เพื่อรองรับเวลาระหว่างป้ายที่ไม่ใช่จำนวนเต็ม
    for t_int in range(simulation_time):
        t = float(t_int)

        # Enqueue ผู้โดยสารที่ถึงป้ายแล้ว
        newly_arrived = []
        remaining_pending = []
        for p in pending:
            if p.arrival_time <= t:
                if p.origin in queues:
                    queues[p.origin].append(p)
                newly_arrived.append(p)
            else:
                remaining_pending.append(p)
        pending = remaining_pending

        # เคลื่อนรถและรับ-ส่งผู้โดยสาร
        for bus in buses:
            if t < bus.next_depart_time or t > bus.endTime:
                continue

            if bus.started:
                # เคลื่อนไปป้ายถัดไป
                bus.current_index = (bus.current_index + 1) % len(bus.route)
                # อัปเดตเวลาออกรถถัดไปตาม segment time จริง
                seg_idx = (bus.current_index - 1) % len(bus.segment_times)
                bus.next_depart_time = t + bus.segment_times[seg_idx] + DWELL_TIME_MIN
                # Layover ที่ป้ายแรก (ปลายรอบ)
                if bus.current_index == 0:
                    bus.next_depart_time += LAYOVER_TIME_MIN
                    bus.trip_count += 1
            else:
                bus.started = True
                bus.next_depart_time = t + (bus.segment_times[0] if bus.segment_times else 1.0) + DWELL_TIME_MIN

            current_stop = bus.route[bus.current_index]

            # ลงรถ
            alighted = []
            remaining_on_bus = []
            for p in bus.passengers:
                if p.destination == current_stop:
                    p.alight(t)
                    alighted.append(p)
                else:
                    remaining_on_bus.append(p)
            bus.passengers = remaining_on_bus

            # ขึ้นรถ
            boarded = []
            new_queue = []
            for p in queues.get(current_stop, []):
                if len(bus.passengers) < bus.capacity and p.destination in bus.route:
                    p.board(t)
                    bus.passengers.append(p)
                    boarded.append(p)
                else:
                    new_queue.append(p)
            if current_stop in queues:
                queues[current_stop] = new_queue

            # สะสม counter รายคัน (feedback #6: Monitor utilization)
            bus.total_boarded += len(boarded)
            bus.total_alighted += len(alighted)

            # บันทึก Event
            if alighted or boarded:
                event_log.append({
                    "t": t,
                    "bus_id": bus.id,
                    "stop": current_stop,
                    "boarded": len(boarded),
                    "alighted": len(alighted),
                    "on_bus": len(bus.passengers),
                    "queue_remaining": len(queues.get(current_stop, [])),
                })

    # ─── 5. สิ้นสุด Simulation: Mark คนตกค้าง ────────────────────────────
    for stop, q in queues.items():
        for p in q:
            p.strand()
    for bus in buses:
        for p in bus.passengers:
            # คนค้างบนรถ = ไม่ถึงปลายทาง ถือเป็น stranded ด้วย
            p.strand()

    # ─── 6. รวมสถิติ ──────────────────────────────────────────────────────
    served = [p for p in all_passengers if p.is_served]
    stranded = [p for p in all_passengers if p.is_stranded]
    with_class = [p for p in served if p.class_start_time is not None]
    on_time = [p for p in with_class if p.is_on_time]
    late_pax = [p for p in with_class if not p.is_on_time]

    wait_times = [p.wait_time for p in served if p.board_time is not None]
    travel_times = [p.travel_time for p in served if p.drop_time is not None]
    delay_times = [p.delay_minutes for p in late_pax]

    avg_wait = sum(wait_times) / len(wait_times) if wait_times else 0.0
    avg_travel = sum(travel_times) / len(travel_times) if travel_times else 0.0
    avg_delay = sum(delay_times) / len(delay_times) if delay_times else 0.0
    on_time_rate = len(on_time) / len(with_class) * 100 if with_class else 0.0

    # ─── Per-bus utilization (feedback #6: Monitor each bus) ──────────────
    bus_stats: list[dict] = []
    for b in buses:
        util_pct = (b.total_boarded / (b.trip_count * b.capacity) * 100) if b.trip_count > 0 and b.capacity > 0 else 0.0
        bus_stats.append({
            "bus_id": b.id,
            "route": b.route,
            "capacity": b.capacity,
            "trips": b.trip_count,
            "boarded": b.total_boarded,
            "alighted": b.total_alighted,
            "ended_with_pax": len(b.passengers),
            "utilization_pct": round(util_pct, 2),
        })
    total_trips = sum(b.trip_count for b in buses)
    fleet_util = (sum(b.total_boarded for b in buses) /
                  max(1, total_trips * bus_capacity) * 100) if buses else 0.0

    # ─── Mobility: Origin-Destination matrix (feedback #5) ────────────────
    od_counts: dict[tuple, int] = {}
    for p in all_passengers:
        key = (p.origin, p.destination)
        od_counts[key] = od_counts.get(key, 0) + 1
    od_matrix = [
        {"from": o, "to": d, "count": c}
        for (o, d), c in sorted(od_counts.items(), key=lambda kv: -kv[1])
    ]

    # ─── Mobility: time series — waiting / on-bus / arrived ──────────────
    # Bin by 10-minute buckets so the series is dashboard-friendly
    BUCKET = 10
    n_buckets = (simulation_time // BUCKET) + 1
    arrived_cum = [0] * n_buckets
    boarded_cum = [0] * n_buckets  # cumulative boardings
    arrival_at_stop_cum = [0] * n_buckets  # cumulative passengers who've reached their stop

    for p in all_passengers:
        if p.drop_time is not None:
            idx = min(n_buckets - 1, int(p.drop_time // BUCKET))
            arrived_cum[idx] += 1
        if p.board_time is not None:
            idx = min(n_buckets - 1, int(p.board_time // BUCKET))
            boarded_cum[idx] += 1
        if p.arrival_time is not None:
            idx = min(n_buckets - 1, int(p.arrival_time // BUCKET))
            arrival_at_stop_cum[idx] += 1

    # Convert to running totals
    for i in range(1, n_buckets):
        arrived_cum[i] += arrived_cum[i - 1]
        boarded_cum[i] += boarded_cum[i - 1]
        arrival_at_stop_cum[i] += arrival_at_stop_cum[i - 1]

    timeseries = []
    for i in range(n_buckets):
        t_minute = i * BUCKET
        waiting = arrival_at_stop_cum[i] - boarded_cum[i]  # มาถึงป้ายแล้ว แต่ยังไม่ขึ้นรถ
        on_bus = boarded_cum[i] - arrived_cum[i]           # ขึ้นรถแล้ว แต่ยังไม่ถึงปลายทาง
        timeseries.append({
            "t": t_minute,
            "waiting": max(0, waiting),
            "on_bus": max(0, on_bus),
            "arrived": arrived_cum[i],
        })

    return {
        # ─ เวลาเฉลี่ย (Backward compatible) ─
        "avg_wait_time": round(avg_wait, 2),
        "avg_travel_time": round(avg_travel, 2),
        # ─ ผลตรง ๆ ─
        "total_passengers": len(all_passengers),
        "served_passengers": len(served),
        "stranded_passengers": len(stranded),     # ตกค้างที่ป้าย + ค้างบนรถ
        "waiting_passengers": sum(len(q) for q in queues.values()),  # ยังรอ
        # ─ Punctuality ─
        "passengers_with_class": len(with_class),
        "on_time_passengers": len(on_time),
        "late_passengers": len(late_pax),
        "on_time_rate_pct": round(on_time_rate, 2),
        "avg_delay_minutes": round(avg_delay, 2),
        "max_delay_minutes": round(max(delay_times, default=0.0), 2),
        # ─ Monitor per-bus (feedback #6) ─
        "bus_stats": bus_stats,
        "total_buses": len(buses),
        "total_trips": total_trips,
        "fleet_utilization_pct": round(fleet_util, 2),
        # ─ Mobility (feedback #5): O-D matrix + passenger-flow time series ─
        "od_matrix": od_matrix,
        "mobility_timeseries": timeseries,
        # ─ Event log สำหรับ Visualization เชิงลึก ─
        "event_log": event_log,
    }
