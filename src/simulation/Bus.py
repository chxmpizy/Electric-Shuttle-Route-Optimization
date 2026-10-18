"""
src/simulation/Bus.py
======================
รถบัสไฟฟ้าในระบบ Discrete-Event Simulation

การเปลี่ยนแปลง:
  - เพิ่ม segment_times: list[float] สำหรับเวลาระหว่างแต่ละป้ายจากกราฟจริง
  - trip_count: นับจำนวนรอบที่วิ่งแล้ว สำหรับ Monitor
  - total_boarded, total_alighted: สะสมตลอดการจำลอง
"""
from __future__ import annotations


class Bus:
    def __init__(
        self,
        bus_id: int,
        capacity: int,
        route: list[str],
        next_depart_time: float,
        headway: float,
        end_time: float,
        segment_times: list[float] | None = None,
        travel_time: float = 1.0,   # legacy fallback
    ):
        self.id = bus_id
        self.capacity = capacity
        self.route = route
        self.next_depart_time = next_depart_time
        self.headway = headway
        self.endTime = end_time

        # เวลาเดินทางแต่ละช่วง (จาก graph จริง)
        if segment_times:
            self.segment_times = segment_times
        else:
            # Fallback: แบ่งเวลา travel_time เท่า ๆ กัน
            n = max(1, len(route) - 1)
            self.segment_times = [max(1.0, travel_time)] * n

        # State
        self.current_index: int = 0
        self.started: bool = False
        self.passengers: list = []

        # Monitor counters
        self.trip_count: int = 0
        self.total_boarded: int = 0
        self.total_alighted: int = 0

    @property
    def occupancy(self) -> int:
        return len(self.passengers)

    @property
    def occupancy_rate(self) -> float:
        return self.occupancy / self.capacity if self.capacity > 0 else 0.0

    def __repr__(self) -> str:
        return (
            f"Bus(id={self.id}, stop={self.route[self.current_index]}, "
            f"pax={self.occupancy}/{self.capacity})"
        )
