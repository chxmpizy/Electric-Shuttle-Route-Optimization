"""
src/simulation/Passenger.py
============================
ขยาย Passenger class ให้รองรับข้อมูลเวลาเรียน เวลาเดิน
และคำนวณผลทัน/สาย ตาม Feedback อาจารย์
"""
from __future__ import annotations
from typing import Optional


class Passenger:
    """
    ผู้โดยสารในการจำลองแบบ Discrete-Event

    Lifecycle:
        WAITING  → (ขึ้นรถ) → ON_BUS → (ลงรถ) → WALKING → ARRIVED
        WAITING  → (สิ้นสุด Simulation ยังไม่ได้ขึ้น) → STRANDED
    """

    def __init__(
        self,
        passenger_id: int,
        origin: str,
        destination: str,
        arrival_time: float,
        class_start_time: Optional[float] = None,
        walk_time_minutes: float = 5.0,
        arrive_before_min: float = 0.0,
        course_code: str = "",
    ):
        # ─── Identity ─────────────────────────────────────────────────────────
        self.passenger_id = passenger_id
        self.origin = origin
        self.destination = destination
        self.course_code = course_code

        # ─── Timeline ──────────────────────────────────────────────────────────
        self.arrival_time: float = arrival_time          # ถึงป้ายต้นทาง (นาที)
        self.class_start_time: Optional[float] = class_start_time   # เริ่มเรียน (นาที)
        self.walk_time_minutes: float = walk_time_minutes            # เดินจากป้ายถึงอาคาร
        self.arrive_before_min: float = arrive_before_min            # buffer ที่อยากถึงก่อน

        # ─── Simulation state (กำหนดระหว่างรัน Simulation) ───────────────────
        self.board_time: Optional[float] = None          # ขึ้นรถ
        self.drop_time: Optional[float] = None           # ลงรถที่ป้ายปลายทาง
        self.building_arrival_time: Optional[float] = None  # ถึงอาคาร

        # ─── Outcome (คำนวณหลัง Simulation) ──────────────────────────────────
        self.is_served: bool = False         # ได้ขึ้นรถและไปถึงปลายทาง
        self.is_stranded: bool = False       # ไม่ได้ขึ้นรถเมื่อสิ้น Simulation
        self.is_on_time: bool = False        # ถึงอาคารทันเรียน
        self.is_comfortable: bool = False    # ถึงก่อนเรียน (เผื่อ buffer)
        self.delay_minutes: float = 0.0      # สายกี่นาที (0 ถ้าทัน)
        self.wait_time: float = 0.0          # รอที่ป้าย (board_time - arrival_time)
        self.travel_time: float = 0.0        # บนรถ (drop_time - board_time)
        self.total_trip_time: float = 0.0    # รวมทั้งหมด (walk included)

    # ─── Lifecycle methods ────────────────────────────────────────────────────

    def board(self, t: float) -> None:
        """บันทึกเวลาขึ้นรถ"""
        self.board_time = t
        self.wait_time = t - self.arrival_time

    def alight(self, t: float) -> None:
        """บันทึกเวลาลงรถ และคำนวณผลลัพธ์ทั้งหมด"""
        self.drop_time = t
        if self.board_time is not None:
            self.travel_time = t - self.board_time
        self.building_arrival_time = t + self.walk_time_minutes
        self.total_trip_time = self.walk_time_minutes + (self.board_time - self.arrival_time if self.board_time else 0) + self.travel_time
        self.is_served = True
        self._evaluate_punctuality()

    def strand(self) -> None:
        """ผู้โดยสารตกค้างเมื่อสิ้นสุด Simulation"""
        self.is_stranded = True
        self.is_served = False

    def _evaluate_punctuality(self) -> None:
        """คำนวณว่าเข้าเรียนทันหรือสาย"""
        if self.class_start_time is None or self.building_arrival_time is None:
            return
        late = self.building_arrival_time - self.class_start_time
        self.delay_minutes = max(0.0, late)
        self.is_on_time = (self.delay_minutes == 0.0)
        # comfortable = ถึงก่อนเรียน โดยเผื่อ buffer ด้วย
        comfortable_deadline = self.class_start_time - self.arrive_before_min
        self.is_comfortable = (self.building_arrival_time <= comfortable_deadline)

    # ─── Convenience properties ───────────────────────────────────────────────

    @property
    def status(self) -> str:
        if self.is_stranded:
            return "STRANDED"
        if not self.is_served:
            return "WAITING"
        if self.class_start_time is None:
            return "SERVED"
        return "ON_TIME" if self.is_on_time else f"LATE+{self.delay_minutes:.1f}m"

    def __repr__(self) -> str:
        return (
            f"Passenger(id={self.passenger_id}, "
            f"{self.origin}→{self.destination}, "
            f"arr={self.arrival_time:.0f}, "
            f"class={self.class_start_time}, "
            f"status={self.status})"
        )
