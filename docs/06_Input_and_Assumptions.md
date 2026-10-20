---
title: 06. Input Data & Assumptions
tags:
  - project/uniflow-ev
  - documentation
  - advisor-feedback
feedback_ref: "#4 — Input ที่มาและสมมติฐาน"
date: 2026-10-20
status: current
---

# 06. Input ที่ป้อนเข้าระบบ และสมมติฐาน

> ตอบ feedback อาจารย์ข้อ 4: "ต้องมีสไลด์อธิบายว่าป้อนข้อมูลอะไร คนอยู่ที่ไหน จะไปไหน
> ต้องถึงกี่โมง และนำข้อมูลนั้นไปทำอะไรต่อ"

เอกสารนี้แยก Input ของระบบเป็น 3 ประเภทตามแหล่งที่มา:
**ข้อมูลจริง** (ตรวจสอบย้อนกลับได้) / **ข้อมูลที่อนุมาน** (คำนวณจากข้อมูลจริง) / **ข้อมูลสมมติ** (ตั้งขึ้นจาก paper + ความสมเหตุสมผล)

---

## 1. ภาพรวม Data Flow

```
   ตารางเรียน CS (xlsx)             GPS + ระยะทาง (osm.xml)
         │                                   │
         ▼                                   ▼
   src/data/timetable.py           src/data/graph.py
   ─ แปลงคาบเรียน → PassengerDemand    ─ สร้างกราฟ node/edge
   ─ จับคู่ตึก → ป้าย                   ─ คำนวณเวลาระหว่างป้าย
         │                                   │
         └──────────── combine ─────────────┘
                         │
                         ▼
              RouteContext (passenger_demands + graph)
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
     Simulation       Algorithms      Trip Planner
     (engine.py)    (GA/SA/PSO/ACO)  (/api/plan-trip)
```

---

## 2. ข้อมูลจริง (Real Data) — ตรวจสอบย้อนกลับได้

| # | ข้อมูล | แหล่งที่มา | ไฟล์ | ใช้ที่ไหน |
|---|---|---|---|---|
| 1 | ตารางเรียน CS ภาคปกติ ปี 1 เทอม 1/2569 | หลักสูตร CS ธรรมศาสตร์ (ขอจาก Advisor) | `data/raw/cs_timetable.xlsx` | สร้าง `PassengerDemand` 400 คน |
| 2 | ชื่อวิชา / รหัสวิชา / วัน / เวลา / อาคาร | ตารางสอน UDR | ภายใน xlsx | map เป็นต้นทาง-ปลายทาง + class_start_time |
| 3 | พิกัด GPS ของแต่ละป้าย | OpenStreetMap + Google Maps (วัดเอง) | `src/models/thammasat.net.xml`, `src/data/graph.py:gps_coordinates` | คำนวณเวลาเดินทางระหว่างป้าย |
| 4 | จำนวนนักศึกษาต่อคณะ | ข้อมูลสำนักทะเบียน (ปีการศึกษา 2567) | `src/data/routes.py` STOP_WEIGHTS | น้ำหนักความต้องการใน legacy random mode |
| 5 | ขอบเขตเวลาให้บริการ 06:00–21:00 | จากพฤติกรรมการเรียน + บริการเดิม | `src/config/settings.py` `START_TIME/END_TIME` | จำกัดช่วง simulation |

### รายละเอียดตารางเรียน CS ที่ใช้ (data/raw/cs_timetable.xlsx)

| วิชา | วัน | เวลา | อาคาร → ป้าย | ผู้โดยสารต่อครั้ง |
|---|---|---|---|---|
| CS100 | อังคาร 08:00 | LC3 → Lecture | 300 คน (วิชาทั่วไป ×3 เซค×100) |
| CS211 | อังคาร 13:00 | SC4 → SC2_SC3 | 50 คน (วิชา CS จำกัดเซค) |
| CS212 | พฤหัสบดี 09:30 | SC3 → SC2_SC3 | 50 |
| CS213 | พฤหัสบดี 13:00 | SC4 → SC2_SC3 | 50 |

รวม **400 ผู้โดยสาร × 2 วัน** = ชุดทดสอบ CS pilot ที่ใช้ใน `cs_benchmark.py`

---

## 3. ข้อมูลที่อนุมาน (Inferred) — คำนวณจากข้อมูลจริง

| # | ข้อมูล | สูตร / วิธีคำนวณ | ไฟล์ |
|---|---|---|---|
| 1 | เวลาเดินทางระหว่างป้าย | Haversine (lat/lon) ÷ 50 km/h | `src/data/graph.py:calculate_cycle_time` |
| 2 | Cycle time ของเส้นทาง | ผลรวม segment_times + dwell × จำนวนป้าย + layover | `engine._build_segment_times` + `DWELL_TIME_MIN` + `LAYOVER_TIME_MIN` |
| 3 | เวลาที่ผู้โดยสารต้องถึงป้ายต้นทาง | `class_start − walk − travel − buffer − arrive_before` | `data/timetable.py:216-229` |
| 4 | จำนวนเที่ยวที่รถคันหนึ่งวิ่งได้ต่อวัน | `(endTime − startTime) ÷ cycle_time` | `engine.py` simulation loop |
| 5 | On-time rate | ผู้โดยสารที่มาถึงอาคารก่อน `class_start − ARRIVE_BEFORE_MIN` | `simulation/Passenger.py:is_on_time` |

---

## 4. ข้อมูลสมมติ (Assumed) — ตั้งขึ้นจาก paper + ความสมเหตุสมผล

### 4.1 ค่าเวลาต่าง ๆ (`src/data/timetable.py:36-39`)

| Parameter | ค่า | หน่วย | เหตุผล |
|---|---|---|---|
| `BUFFER_MIN` | **5.0** | นาที | เผื่อความคลาดเคลื่อนของเวลาเดินทาง — ตาม Díaz-Ramírez (2022) ใช้ time-window |
| `ARRIVE_BEFORE_MIN` | **10.0** | นาที | Comfort Early Bound — ผู้โดยสารต้องการมาถึงก่อนเริ่มเรียน |
| `SPREAD_HALF_MIN` | **5.0** | นาที | กระจายเวลาผู้โดยสารมาถึงป้าย ±5 นาที (ไม่ใช่พร้อมกันทุกคน) |
| `PREPARATION_MIN` | **3.0** | นาที | เวลาเตรียมตัว + เดินจากหอพักถึงป้าย |

### 4.2 เวลาเดินจากป้ายถึงอาคาร (`WALK_TIME_MIN`)

| ป้าย | เวลาเดินถึงอาคาร (นาที) | หมายเหตุ |
|---|---|---|
| Library | 2 | อยู่ใกล้ป้าย |
| Lecture (LC1–LC5) | 3 | เดินผ่านลาน |
| Social | 3 | |
| Convention | 3 | |
| SC2_SC3 (SC2–SC4) | 4 | |
| Hospital | 4 | |
| SC1 | 5 | |
| Health | 5 | |
| **Default** | **5** | ป้ายอื่น ๆ ที่ไม่ได้ map |

> **ข้อจำกัด:** ค่าเหล่านี้วัดจากการเดินสำรวจเองใน Google Maps ไม่ใช่จากการจับเวลาจริง ข้อมูลจริงอาจแตกต่างตามสภาพอากาศและความเร็วการเดินของแต่ละคน

### 4.3 ขนาดคาบเรียน (`src/data/timetable.py:71-72`)

| ประเภทวิชา | ขนาด (คน/เซค) | เงื่อนไข |
|---|---|---|
| **วิชาจำกัดเซค** (CS, IT เฉพาะทาง) | 50 | เซคปิด เลือกไม่ได้ |
| **วิชาทั่วไป** (TU, EL, EN, LA, SC1xx, MA, PH) | 120 | หลายเซค, ขนาดใหญ่ |

> ค่า 50/120 มาจากการอ้างอิงพฤติกรรม CS ธรรมศาสตร์ ไม่ใช่ข้อมูลสำรวจจริง

### 4.4 ความจุรถและคอนฟิกฝูง (`src/config/settings.py`)

| Parameter | ค่า | หมายเหตุ |
|---|---|---|
| `bus_capacity` | 30 คน/คัน | ตามรถ EV ที่มหาวิทยาลัยใช้งาน |
| `TOTAL_BUSES` | 30 คัน | งบทรัพยากรรวม |
| `MIN_PER_ROUTE` | 1 คัน | อย่างน้อย 1 คัน/สาย |
| `MAX_PER_ROUTE` | 8 คัน | ค่าสูงสุดต่อสาย |
| `NUM_ROUTES` | 6 สาย | ตามโครงข่ายปัจจุบัน |

---

## 5. สมมติฐานหลักของแบบจำลอง

### 5.1 สมมติฐานด้านพฤติกรรมผู้โดยสาร

1. **ผู้โดยสารมาถึงป้ายในเวลา `target_at_stop ± SPREAD_HALF_MIN`** — ไม่สายเกินกว่า 5 นาที
2. **ผู้โดยสารขึ้นรถคันแรกที่ให้ไปปลายทางตรงได้** — ไม่สับเปลี่ยนรถ ไม่ walk-up
3. **ไม่มีผู้โดยสารยกเลิกการเดินทางกลางคัน** — demand คงที่ตลอด simulation
4. **ผู้โดยสารรู้เส้นทางก่อนออกเดินทาง** — ไม่ขึ้นรถผิดทาง

### 5.2 สมมติฐานด้านการจำลองรถ

1. **รถวิ่งด้วยความเร็วเฉลี่ย 50 km/h** — ไม่คิดสภาพจราจรหรือฝน
2. **จอดรับส่งที่ป้ายใช้เวลา 1.5 นาที** (`DWELL_TIME_MIN`) — ตามพฤติกรรมรถ EV
3. **พักปลายรอบ 5 นาที** (`LAYOVER_TIME_MIN`) — ชาร์จไฟหรือเปลี่ยนคนขับ
4. **รถไม่เสีย** — ยังไม่มี replan-online scenario

### 5.3 สมมติฐานด้านเส้นทาง

1. **เส้นทางเป็นวงรอบปิด** — ป้ายแรก = ป้ายสุดท้าย
2. **ป้ายต้นทาง-ปลายทาง 1 ทิศทาง ต่อ 1 รอบ** — ไม่มีการ bidirectional-pickup ในรอบเดียว

---

## 6. ข้อมูลที่ยังขาด / ต้องการจาก Advisor

| # | ข้อมูล | เพื่ออะไร | สถานะ |
|---|---|---|---|
| 1 | ตารางเรียนครบทุกคณะ (ไม่ใช่แค่ CS) | ขยาย demand จาก 400 → หลายพันคน | 🔴 ยังไม่มี |
| 2 | เวลาจอดรถจริง (dwell time measured) | แทนที่สมมติ 1.5 นาที | 🔴 ยังไม่มี |
| 3 | ต้นทุนรถ (บาท/คัน-ชม.) | เปิด `FLEET_COST` ใน fitness เพื่อ minimize cost ได้ | 🔴 ยังไม่มี |
| 4 | จำนวนผู้ลงทะเบียนจริงต่อเซค | ยืนยันขนาด 50/120 | 🟡 ประมาณจาก CS |
| 5 | ข้อมูลจำนวนผู้โดยสารขึ้น-ลงต่อเที่ยวจริง | ใช้ validate on-time rate ของแบบจำลอง | 🔴 ยังไม่มี |
| 6 | GPS trace ของรถจริงในการให้บริการ | ยืนยันความเร็วเฉลี่ย 50 km/h | 🔴 ยังไม่มี |

---

## 7. ผลกระทบของสมมติฐานต่อผลลัพธ์

| สมมติฐานที่ปรับได้ | ถ้าเปลี่ยน จะกระทบ |
|---|---|
| ความเร็ว 50 km/h → 30 km/h | เวลาเดินทางเพิ่มทุก segment → on-time ลดลง |
| Dwell 1.5 → 3 นาที | Cycle time เพิ่ม → headway ยาวขึ้น → ผู้โดยสารรอนานขึ้น |
| Section size 50/120 → 30/60 | จำนวน demand ลดลง → ง่ายกว่า แต่ไม่สะท้อนจริง |
| Walk time เพิ่ม 2 นาที/ป้าย | Deadline ที่ป้ายปลายทางเร็วขึ้น → บางคนไม่ทัน |
| `ARRIVE_BEFORE_MIN` 10 → 5 | เกณฑ์ "ถึงทัน" ผ่อนลง → on-time เพิ่ม |

---

## 8. การตรวจสอบย้อนกลับ (Reproducibility)

ทุกการทดลองใน `cs_benchmark_result.json` บันทึก:
- จำนวน demand ที่ใช้ (`demand_stats.total_passengers`)
- Simulation window (`sim_window_min`)
- Seeds ที่รัน (`SEEDS = [42, 123, 456]`)
- Hardware (`platform`, `python`, `cpu_count`)
- Parameters ของทุก algorithm (`algo_params`)
- โหมด demand (`demand_mode = "fixed-demand"`)

ดังนั้นผู้ตรวจสอบสามารถ clone repo → รัน `cs_benchmark.py` → ได้ผลเหมือนกันทุกครั้ง (ภายใต้ seed เดียวกัน)

---

## 9. อ้างอิง

- **Díaz-Ramírez, J., Leal-Garza, C. M., & Gómez-Acosta, C.** (2022). A smart school routing and scheduling problem for the new normalcy. *Computers & Industrial Engineering*, 168, 108101. https://doi.org/10.1016/j.cie.2022.108101
- **ตารางเรียน CS ธรรมศาสตร์** — `data/raw/cs_timetable.xlsx`
- **โครงข่ายถนน TU Rangsit** — `src/models/thammasat.net.xml` (จาก OpenStreetMap)
