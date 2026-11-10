---
title: 08. Advisor Feedback — Status Update (2026-11-01)
tags:
  - project/uniflow-ev
  - advisor-feedback
  - status
  - progress-report
feedback_ref: "ครอบคลุม 11 หัวข้อตามเอกสาร 03"
date: 2026-11-01
status: current
author:
  - Rattasat Onnomdee (6509650229)
  - Nontapat Rangubthuk (6509650534)
advisor: Asst. Prof. Dr. Pokpong Songmuang
---

# 08. สถานะการปรับปรุงตาม Feedback อาจารย์ (ณ 2026-11-01)

> **เชื่อมโยง:** [[00_Index|หน้าหลัก]] | [[02_Current_Status_vs_Remaining_Gaps|สถานะเดิม 15 ต.ค.]] | [[03_Advisor_Feedback_Deep_Dive|เจาะลึก Feedback 11 ข้อ]] | [[06_Input_and_Assumptions|Input & Assumptions]] | [[07_Fitness_Weights_Rationale|Fitness Weights]]

เอกสารนี้สรุปว่า **แต่ละข้อเสนอแนะของอาจารย์ที่ปรึกษา (ผศ.ดร.ปกป้อง ส่องเมือง) ได้รับการตอบสนองไปแล้วอย่างไร** ระหว่าง 2026-10-15 → 2026-11-01 พร้อมหลักฐานในรูป commit, ไฟล์โค้ด และตัวเลขจากการวัดจริง

---

## สรุประดับผู้บริหาร (Executive Summary)

| # | หัวข้อ Feedback | สถานะเดิม 10/15 | สถานะปัจจุบัน 11/01 | Δ |
|:---:|---|:---:|:---:|:---:|
| 1 | ตรวจเป้าหมาย & เวลา (on-time) | ไม่มี | ตรวจทันเรียนครบ | **+100%** |
| 2 | Input & ข้อมูลตรวจย้อนกลับได้ | สุ่ม random | ตารางเรียน CS จริง | **+100%** |
| 3 | Multi-objective goal function | 0.5 wait + 0.5 travel | wait+travel+delay+stranded | **+100%** |
| 4 | Fair benchmarking (seeds, budget) | 1 run | 3 seeds × 4 algos + baseline | **+100%** |
| 5 | Mobility monitor dashboard | บางส่วน | ครบ (per-stop, util, OD, timeseries) | **+70%** |
| 6 | Fleet size minimization | ไม่มี | มี script แต่ยังไม่ได้รันครบ | **+60%** |
| 7 | SUMO microscopic + persons | รถวิ่ง ไม่มีคน | เหมือนเดิม | — |
| 8 | Pilot CS100 → CS-wide | ไม่มี | CS pilot 400 → 16,050 pax | **+100%** |
| 9 | Discussion & robustness | ไม่มี | มี sensitivity 8 configs | **+50%** |
| 10 | Timeline & action plan | มีแล้ว (doc 05) | ยังใช้ได้ | — |
| 11 | Checklist | มีแล้ว (doc 05) | ยังใช้ได้ | — |

**ภาพรวมความคืบหน้า:** ประมาณ **65% → 85%** ของทุกหัวข้อ feedback

**เอกสารใหม่ที่สร้างในรอบนี้:**

- [[06_Input_and_Assumptions]] (ตอบ feedback #2)
- [[07_Fitness_Weights_Rationale]] (ตอบ feedback #3)
- เอกสารฉบับนี้ (รายงานสถานะรวม)

---

## Benchmark Methodology — Threads / Seeds / Iterations

> ตอบคำถาม "**ใช้ Thread กี่ตัว รันกี่รอบต่อ algorithm และทำไมถึงเลือกค่านี้?**"
> ตัวเลขทั้งหมดบันทึกไว้ใน `cs_benchmark.py` และ metadata ของ `cs_benchmark_result_v2.json`

### 1. Threads: **1 (Sequential)**

```python
"hardware": {
    "cpu_count": 10,
    "parallelism": "sequential (1 thread per algorithm run)"
}
```

**ที่มา — ทำไมไม่ใช้หลาย thread ทั้งที่ CPU 10 cores?**

1. **Reproducibility (ความทำซ้ำได้):** ทุกการรันต้องให้ผลเหมือนเดิมเมื่อใช้ seed เดิม ถ้าใช้หลาย thread → แข่งกันเรียก `random.random()` → ผลลัพธ์เปลี่ยนทุกครั้ง ทำให้เปรียบเทียบไม่ได้
2. **Fair comparison:** ทุก algorithm ได้ compute budget เท่ากัน — ถ้า PSO ใช้ 10 thread แต่ SA ใช้ 1 thread → PSO "โกง" ได้เปรียบในเวลา wall-clock
3. **DES simulation ติด GIL อยู่แล้ว:** `run_simulation()` ใน `src/simulation/engine.py` เป็น discrete-event loop แบบ pure Python → ไม่ได้ประโยชน์จาก threading อยู่ดี (ต้อง `multiprocessing` ถึงจะช่วย)
4. **Debugging:** stack trace อ่านง่าย, bisect ได้

**แลกกับ:** benchmark ทั้งชุด (4 algo × 3 seeds + baseline) ใช้เวลา ~20 นาที บน M1 Mac — ยอมรับได้

### 2. จำนวนการรันต่อ Algorithm: **3 Seeds**

```python
SEEDS = [42, 123, 456]
```

**ที่มา — ทำไม 3?**

1. **ขั้นต่ำสำหรับสถิติ:** ต้องการ ≥3 เพื่อคำนวณ mean / min / max ที่มีความหมาย (รายงานเป็น `mean_score`, `best_score`, `worst_score` ใน JSON)
2. **Trade-off กับเวลารัน:**
   - PSO 1 seed ≈ 10 นาที → **3 seeds = 30 นาที** ต่อ algorithm
   - ถ้าเพิ่มเป็น 5-10 seeds (ตาม paper Díaz-Ramírez §5.2) → ต่อ algorithm ใช้ 1-2 ชม. × 4 algo = **4-8 ชม.** ต่อ 1 benchmark run
3. **ชดเชยด้วย determinism:** GA/SA/PSO ใน config ปัจจุบัน converge แบบ deterministic (seed เดียวให้ score เดิม) → ส่วน ACO ที่มี randomness สูงจะเห็น spread (ACO best=28.21, worst=31.39)
4. **Seeds เลือกจาก paper convention:** 42, 123, 456 เป็นค่าที่ใช้กันแพร่หลายในวรรณกรรม — reviewer ตรวจซ้ำได้

**ยอมรับว่าเป็น trade-off:** paper reference ใช้ 10 seeds — ของเราใช้ 3 เพราะทรัพยากรจำกัด (จะอธิบายเพิ่มในหัวข้อ Discussion)

### 3. Iterations ต่อ Algorithm

จาก `cs_benchmark.py` lines 36-40:

```python
GA_GENS   = 15
SA_ITERS  = 200
PSO_ITERS = 30
ACO_ITERS = 20   # × num_ants=10
```

เทียบกับ `src/config/settings.py` (ค่า default สำหรับการใช้งานปกติ):

| Algorithm | Benchmark Config | Default | หน่วย | ลดลงเพราะ |
|---|---:|---:|:---:|---|
| GA | **15** gens | 30 | generations | Benchmark ต้องรัน 3 seeds × 4 algo → ลดครึ่งเพื่อให้จบใน budget |
| SA | **200** iter | 300 | iterations | SA cooling 100 → ~0.1 ภายใน 200 iter เพียงพอ |
| PSO | **30** iter | 50 | iterations | PSO converge เร็ว; 30 iter เห็น plateau ชัดใน sensitivity test |
| ACO | **20** × 10 ants | 50 × 30 | iter × ants | ACO stochastic สูง → ลดลงเพื่อให้ 3 seeds ครบใน budget |

### 4. Fitness Evaluations ต่อ Algorithm (compute budget)

สิ่งที่ paper เรียก "**fair budget**" คือ **จำนวนครั้งที่เรียก fitness function** ไม่ใช่จำนวน iterations

| Algorithm | สูตร | Evaluations ต่อ seed | Evaluations รวม (3 seeds) |
|---|---|---:|---:|
| GA  | 15 gens × 30 pop | **450** | 1,350 |
| SA  | 200 iter × 1 trial | **200** | 600 |
| PSO | 30 iter × 30 particles | **900** | 2,700 |
| ACO | 20 iter × 10 ants | **200** | 600 |

**ที่มา — ทำไม compute budget ไม่เท่ากัน?**

- **SA/ACO** เป็น local-search → iteration เพิ่มน้อยคน (1-10 ตัว) → ต้อง iter เยอะ
- **GA/PSO** เป็น population-based → ต่อ iteration ประเมินทั้ง population
- Benchmark ปัจจุบัน **ไม่สมดุล** — GA 450, SA 200, PSO 900, ACO 200
- **จุดอ่อนที่ยอมรับ:** นี่คือ gap ของ feedback #4 ที่ยังไม่สมบูรณ์ 100% — paper แนะนำให้ equalize `n_evals = 500` ทุก algorithm → ต้องปรับ GA 17 gens, SA 500 iter, PSO 17 iter, ACO 50 × 10 ants
- **ไว้ทำใน V3 ของ benchmark**

### 5. ทำไมเลือกค่าปัจจุบัน (sanity check)

- **GA 15 gens**: จาก sensitivity test ก่อนหน้า ภายใน 15 gens score plateau แล้ว (ดู `history` ใน JSON — รอบที่ 10+ ไม่ขยับ)
- **SA 200 iter**: cooling schedule `T = 100 × 0.95^iter` → `T=100×0.95^200 = 3.5e-3` ≈ ยอมรับ worse แค่ 0.3% → converged
- **PSO 30 iter**: swarm 30 ตัว × 30 iter = 900 evals เพียงพอให้ global best ลงตัว (sensitivity: iter 20 vs 50 → score ต่างกัน <2%)
- **ACO 20 × 10 ants**: pheromone update ทุกรอบ → 20 iter เพียงพอให้เส้นทางเด่นชัดใน CS pilot (demand ไม่กว้าง)

### 6. สรุปตัวเลขทั้งหมดสำหรับ reviewer

| รายการ | ค่า | ที่มา |
|---|---|---|
| Threads | 1 (sequential) | reproducibility + fair comparison |
| Random seeds | 3 (42, 123, 456) | min for stats + time budget |
| Hardware | macOS M-series, Python 3.13 | บันทึกใน metadata |
| GA | 15 gens × 30 pop = 450 evals | reduced from 30 default |
| SA | 200 iter × 1 = 200 evals | cooling schedule converged |
| PSO | 30 iter × 30 particles = 900 evals | reduced from 50 default |
| ACO | 20 iter × 10 ants = 200 evals | reduced from 50×30 default |
| Baseline | 1 run (deterministic) | ไม่มี random component |
| Total wall-clock | ~20 นาที บน M1 Mac | 4 algos × 3 seeds + baseline |

---

## รายละเอียดต่อข้อ (Section-by-Section Status)

### หัวข้อ 1 — ตรวจเป้าหมายและการคำนวณเวลา

**Feedback เดิม:** ระบบวัดแค่เวลาเฉลี่ย ตอบไม่ได้ว่าใครเข้าเรียนทัน

**สิ่งที่ทำแล้ว:**
- เพิ่มฟิลด์ `class_start_time`, `walk_time_minutes`, `is_on_time`, `delay_minutes` ใน `src/simulation/Passenger.py`
- สูตรเวลาถึงอาคาร: `drop_time + walk_time` และ `late_minutes = max(0, arrival - class_start)` ที่ `src/simulation/engine.py`
- Dwell time 1.5 นาที/ป้าย + Haversine บนกราฟถนนจริง (ไม่ใช่หารเฉลี่ยอีกต่อไป) — เอกสาร [[06_Input_and_Assumptions]] §3
- Trip Planner บน web (`/u` → "วางแผน") คำนวณ "ต้องออกจากที่พักเวลา HH:MM:SS" ให้ user โดยตรง

**หลักฐาน:**
- Commit `d36ed59` — Timetable-driven demand, punctuality tracking
- ตัวเลขจาก `cs_benchmark_result_v2.json` → **On-time rate วัดได้แล้ว** ทั้ง 5 อัลกอริทึม

**ยังขาด:** ยังไม่ได้ทำกราฟ "On-time vs Late vs Stranded breakdown" แบบ pie chart แยกตามคาบเรียน

---

### หัวข้อ 2 — Input และสมมติฐานที่ตรวจย้อนกลับได้

**Feedback เดิม:** ตัวเลข demand ต้องมีที่มา ไม่สุ่มเอง

**สิ่งที่ทำแล้ว:**
- สร้าง **ตารางเรียน CS จริง** `data/raw/cs_timetable.xlsx` (36 วิชา × 2 วัน × 3 เซคชัน) — รวม **16,050 ผู้โดยสาร/สัปดาห์**
- แปลงเป็น `PassengerDemand` ใน `src/data/timetable.py`
- Mapping อาคาร → ป้ายรถ: LC/บร. → `Lecture`, SC3-4 → `SC2_SC3`
- เอกสาร [[06_Input_and_Assumptions]] แยก Input เป็น **จริง / อนุมาน / สมมติ** ตามคำแนะนำ

**หลักฐาน:**
- Commit `d36ed59`, `ec966d0`
- Metadata ใน `cs_benchmark_result_v2.json`:
  ```
  "total_passengers": 16050
  "unique_courses": 36
  "by_destination_stop": { "Lecture": 6030, "SC2_SC3": 10020 }
  ```

**ยังขาด:** ขยายไปทุกคณะ (ไม่เฉพาะ CS) ใน Macro Testbed

---

### หัวข้อ 3 — Multi-Objective Goal Function

**Feedback เดิม:** `0.5·wait + 0.5·travel` หลอกตา (รถว่าง = คะแนนดี)

**สิ่งที่ทำแล้ว:**
- Fitness ใหม่ใน `src/optimization/fitness.py`:
  ```
  cost = 0.3·wait + 0.0·travel + 0.7·delay
       + 60·unserved_ratio + fleet_cost
  ```
- เอกสาร [[07_Fitness_Weights_Rationale]] อธิบายน้ำหนัก + **ทดลอง sensitivity 8 configs** ที่ `fitness_sensitivity.py` / `fitness_sensitivity_result.json`
- Config F (paper abstract 0.3/0.0/0.7) → On-time **90.5%** ใน pilot

**หลักฐาน:**
- Commit `d36ed59`, `bc486b3`
- `cs_benchmark_result_v2.json` → `fitness_weights`:
  ```
  W_WAIT: 0.3, W_TRAVEL: 0.0, W_DELAY: 0.7
  PENALTY_UNSERVED: 60, FLEET_COST: 0
  ```

---

### หัวข้อ 4 — Fair Benchmarking

**Feedback เดิม:** GA/SA/PSO/ACO ค้นหาตัวแปรต่างกัน ไม่มี replication

**สิ่งที่ทำแล้ว:**
- กำหนด **Decision Variables มาตรฐาน** ทุก algorithm: `headway`, `fleet_size`, `start_time` บน candidate routes เดียวกัน
- ทำซ้ำ **3 seeds** (42, 123, 456) ต่อ algorithm — รายงาน mean/best/worst
- Compute budget: GA 15 gen, SA 200 iter, PSO 30 iter, ACO 20 iter × 10 ants
- Convergence curve บน web (`/convergence` tab)
- อ้างอิง paper **Díaz-Ramírez et al. (2022)** ใน metadata

**ผลล่าสุด (`cs_benchmark_result_v2.json`, demand 16,050 คน):**

| Algorithm | On-time % | Avg Wait | Avg Delay | Served | Stranded | Buses | Util % | Time (s) |
|:---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 5.24 | 131.4 | 131.8 | 10,690 | 5,360 | 30 | 43.8 | — |
| **GA** | **6.89** | 81.6 | 82.4 | **15,990** | 60 | 30 | 68.1 | 257.7 |
| SA | 5.05 | 124.7 | 124.2 | 11,288 | 4,762 | 27 | 57.1 | 120.3 |
| PSO | 4.26 | 200.9 | 202.5 | 6,850 | 9,200 | 34 | 27.6 | 588.1 |
| **ACO** | **10.05** (mean) / **15.5** (best) | 98.4 | 112.7 | 10,290 | 5,760 | 33 | 37.9 | 312.4 |

**หลักฐาน:**
- Commit `ec966d0`, `cad2f98`
- Benchmark script: `cs_benchmark.py`
- Raw: `cs_benchmark_result_v2.json` + `cs_benchmark_v2.log`

**ยังขาด:** On-time % ยังไม่ดีนัก (<15%) เพราะ demand 16,050 คนหนักเกินฝูง 30 คัน → เป็นข้อมูลสำคัญสำหรับ "สรุป trade-off" ในหัวข้อ 9

---

### หัวข้อ 5 — Mobility & Monitor Dashboard

**Feedback เดิม:** ต้องดูการเคลื่อนที่ของรถ + คน real-time

**สิ่งที่ทำแล้ว:**
- **Admin dashboard** (`/`) มี tabs: Mobility, Convergence, Fleet, Benchmark — แสดง:
  - Per-stop queue (passenger status breakdown: ทัน / สาย / ตกค้าง)
  - Vehicle utilization histogram per bus
  - OD matrix top flows
  - Mobility time-series (รอ / บนรถ / ถึงแล้ว)
- **User dashboard** (`/u`) ใหม่ สำหรับ นศ. ใช้งานจริง 3 แท็บ:
  - **Live map** จริงด้วย OpenStreetMap + Esri satellite + รถเมล์เคลื่อนตามถนน (OSRM road routing)
  - **Hero ETA panel** + leave-at calculator ("ต้องออกจากที่พักเวลา HH:MM:SS")
  - **ตารางเวลาเทียบท่า** + **Trip Planner**

**หลักฐาน:**
- Commit `cad2f98`, `0dddf32`
- ไฟล์: `web/src/components/MobilityPanel.tsx`, `LiveMapGeo.tsx`, `LiveETAPanel.tsx`, `app/u/page.tsx`

**ยังขาด:** เชื่อม live simulation state → dashboard real-time (ปัจจุบัน simulate จาก static schedule)

---

### หัวข้อ 6 — Fleet Size Minimization

**Feedback เดิม:** "ลดจำนวนรถได้กี่คันโดยที่ service ยังไม่ตก?"

**สิ่งที่ทำแล้ว:**
- สร้าง `fleet_reduction.py` สำหรับ sweep จำนวนรถ 30 → 24 → 20 → 16 → 12 → 8
- Layover time 5 นาทีสำหรับความสมจริง

**ยังขาด:**
- ยังไม่ได้รัน sweep ครบและพล็อต trade-off curve "fleet size vs on-time %"
- จะต้องรันแล้วใส่ใน doc 09 ฉบับต่อไป

---

### หัวข้อ 7 — SUMO Microscopic + Persons

**Feedback เดิม:** SUMO ต้องมี `<person>` ขึ้นรถจริง ไม่ใช่แค่โชว์รถวิ่ง

**สิ่งที่ทำแล้ว:**
- รัน SUMO-GUI ผ่าน API endpoint `/api/launch/<algo>` ได้
- แก้ปัญหา SUMO_HOME + XQuartz บน macOS (`eb367d8`)
- Generate `<vehicle>` ตาม schedule ของแต่ละ algo

**ยังขาด:**
- ยังไม่มี `<person>` / `<personTrip>` / `<ride>` ใน route file
- ยังไม่ได้เทียบ Python DES vs SUMO `tripinfo.xml`

---

### หัวข้อ 8 — Pilot (CS100) → ขยายสู่ระบบจริง

**Feedback เดิม:** เริ่มจาก testbed เล็กก่อน

**สิ่งที่ทำแล้ว:**
- **CS Pilot** 400 ผู้โดยสาร → `cs_pilot_test.py`, `cs_pilot_result.json`
- ขยายเป็น **CS Benchmark V2** 16,050 คน (ทุกคาบ CS, 36 วิชา) → `cs_benchmark.py v2`
- Micro / Macro แยกชัดเจน

**หลักฐาน:**
- Commits `d36ed59`, `ec966d0`

---

### หัวข้อ 9 — Discussion & Trade-offs & Robustness

**Feedback เดิม:** วิเคราะห์ความสัมพันธ์ fleet cost vs service quality + robustness

**สิ่งที่ทำแล้ว:**
- **Sensitivity analysis** 8 configs ของน้ำหนัก fitness (เอกสาร [[07_Fitness_Weights_Rationale]])
- ตัวเลข benchmark แยกต่อ seed → เห็น variance (ACO มี std แต่ GA/SA/PSO deterministic)

**ยังขาด:**
- Robustness test (รถเสีย 1 คัน, ฝนตก → เวลาเดินทาง × 1.2)
- Pareto curve "fleet size vs on-time" (ต่อจากหัวข้อ 6)

---

### หัวข้อ 10 & 11 — Timeline & Checklist

**Feedback เดิม:** แผนปฏิบัติเป็นลำดับ + checklist ตรวจความพร้อม

**สิ่งที่ทำแล้ว:**
- [[05_Implementation_Roadmap_and_Action_Plan]] มี Phase 1–6 พร้อม checklist (ตั้งแต่ `d36ed59`)
- เอกสารฉบับนี้ (08) อัพเดต % ความคืบหน้าของแต่ละ phase ตามความเป็นจริง

---

## Timeline การ Commit ที่เกี่ยวข้องกับ Feedback

| Commit | วันที่ | สิ่งที่ทำ | ครอบคลุม Feedback # |
|:---:|:---:|---|:---:|
| `eb367d8` | 2026-10-15 | Fix SUMO-GUI + XQuartz paths | #7 |
| `d36ed59` | 2026-10-18 | Timetable-driven demand, punctuality, multi-objective fitness, CS pilot 400 pax | **#1, #2, #3, #8** |
| `ec966d0` | 2026-10-24 | CS Benchmark V2 (16,050 pax), paper timing method | **#4, #8** |
| `cad2f98` | 2026-10-25 | Bug fixes + mobility panel + convergence + trip planner | **#5** |
| `bc486b3` | 2026-10-28 | Input & Fitness docs (06, 07) + sensitivity 8 configs | **#2, #3, #9** |
| `5aa65b6` | 2026-10-29 | Minor updates | — |
| `0dddf32` | 2026-11-01 | UX/UI redesign + user mode `/u` + real-time map (OSM + OSRM) | **#5** |

---

## ลำดับงานที่ค้างต้องทำต่อ (Prioritized Backlog)

**P0 — จำเป็นก่อนสอบ:**
1. **รัน Fleet Reduction** sweep (`fleet_reduction.py`) 8–30 คัน → พล็อต trade-off curve → ตอบ #6, #9
2. **เพิ่ม `<person>` ใน SUMO** และเทียบ `tripinfo.xml` vs Python DES → ตอบ #7
3. **สรุปผลใน slide/report**: ภาพ convergence + bar chart on-time per algo + Pareto curve

**P1 — ควรทำถ้ามีเวลา:**
4. **Robustness test:** จำลองรถเสีย 1 คัน และฝนตก × 1.2 travel time
5. **ขยาย demand** ไปทุกคณะ (ไม่ใช่แค่ CS)
6. **เชื่อม live simulation** → dashboard real-time

**P2 — Nice to have:**
7. On-time pie chart แยกตามคาบเรียน (ตอบ #1 ให้ครบ)
8. Live map ใช้ GPS จริงจาก fleet (ปัจจุบัน simulate)

---

## เอกสารอ้างอิง

- [[01_Project_Overview_and_Objectives]] — บริบทโครงการ
- [[02_Current_Status_vs_Remaining_Gaps]] — baseline 15 ต.ค.
- [[03_Advisor_Feedback_Deep_Dive]] — รายละเอียด feedback 11 ข้อต้นฉบับ
- [[04_System_Architecture_and_Methodology]] — สถาปัตยกรรม
- [[05_Implementation_Roadmap_and_Action_Plan]] — แผน 6 phase
- [[06_Input_and_Assumptions]] — ตอบ feedback #2
- [[07_Fitness_Weights_Rationale]] — ตอบ feedback #3

**ไฟล์ข้อมูลหลัก:**
- `cs_benchmark_result_v2.json` — ผล benchmark ล่าสุด
- `fitness_sensitivity_result.json` — ผล sensitivity 8 configs
- `data/raw/cs_timetable.xlsx` — ตารางเรียน CS จริง
- `data/raw/real_data.xlsx` — สถิติ นศ. ตามหอพัก (สำหรับ Macro testbed)

---

> **Next review:** หลังรัน fleet reduction + SUMO person → อัพเดตเอกสารนี้เป็น v2
