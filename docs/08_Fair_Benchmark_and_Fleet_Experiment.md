---
title: 08. Fair Benchmark & Fleet Sizing Experiment
tags:
  - project/uniflow-ev
  - benchmark
  - experiment
date: 2026-10-29
status: current
data:
  - cs_benchmark_result.json
  - fleet_experiment_result.json
---

# 08. Benchmark ที่เป็นธรรม และการทดลองลดจำนวนรถ

> **เชื่อมโยง:** [[00_Index|หน้าหลัก]] | [[05_Implementation_Roadmap_and_Action_Plan|Roadmap]] (Phase 4–5) | [[07_Fitness_Weights_Rationale|Fitness Weights]]

---

## 1. บั๊กที่พบและแก้ไข (ทำให้ผล benchmark เดิมใช้ไม่ได้)

| # | บั๊ก | ไฟล์ | ผลกระทบ | การแก้ไข |
|---|---|---|---|---|
| 1 | `run_simulation()` เรียก `random.seed(seed)` ของ **global RNG** ทุกครั้งที่ evaluate (`eval_seed=42`) | `src/simulation/engine.py` | ลำดับสุ่มของทุก algorithm ถูกรีเซ็ตหลัง evaluate ทุกครั้ง → seed ของ benchmark แทบไม่มีผล | ใช้ `random.Random(seed)` เฉพาะใน simulation |
| 2 | `repair()` ทิ้ง route ที่ `endTime > ctx.end_time` แต่ `endTime` ถูกบังคับ ≥ 1080 ขณะที่ window ของ CS benchmark = 900 | `src/optimization/chromosome.py` | **ทุก route ถูกทิ้งแล้วสุ่มใหม่ทุกครั้ง** → GA/SA/ACO เกือบเป็น random search | ไม่ทิ้ง route เพราะเวลาให้บริการยาวกว่า window ได้ |
| 3 | PSO เรียก `repair()` กับ fixed routes ที่เป็น loop (ป้ายแรก = ป้ายสุดท้าย) และมีคู่วิ่งสวนทาง | `src/algorithms/PSO.py` | fixed routes ถูกทิ้งทั้งหมด → PSO ไม่ได้ optimize เส้นทางจริง; ผลทุก seed ออกมาเหมือนกัน (0.244) | PSO ไม่เรียก `repair()` (`discretize()` clamp ค่าอยู่แล้ว) |
| 4 | Budget ไม่เท่ากัน: GA 15×30=450, SA หยุดเองที่ ~225 iter, PSO 30×30=900, ACO 20×10×3 runs=600 | `cs_benchmark.py`, `ACO.py` | เปรียบเทียบ algorithm ไม่เป็นธรรม | ทุกตัว = **500 evaluations** (นับจริงด้วย `get_eval_count()`) |

## 2. ผล Benchmark ใหม่ (500 evaluations × 5 seeds)

Demand: ตารางเรียน CS อังคาร+พฤหัส 400 คน, Seeds `[42, 123, 456, 789, 999]`

| Algorithm | Score best | Score mean ± std | On-time % mean ± std | Stranded |
|---|---|---|---|---|
| Baseline | 0.3358 | — | 53.0 | 0 |
| GA (20 × 25) | 0.0550 | 0.2026 ± 0.1618 | 75.7 ± 27.3 | 0 |
| **SA** (500 iter) | 0.0557 | **0.1028 ± 0.0811** | **91.8 ± 18.3** | 0 |
| PSO (20 × 25, fixed routes) | 0.2158 | 0.2195 ± 0.0034 | 74.4 ± 1.7 | 0 |
| ACO (10 × 50) | 0.0559 | 0.2666 ± 0.2325 | 79.6 ± 19.3 | 0 |

**ข้อสังเกต**
- SA ดีที่สุดทั้งค่าเฉลี่ยและความเสถียร; GA/SA/ACO หาคำตอบดีที่สุดได้ใกล้กัน (~0.055) แต่ GA และ ACO แกว่งมากระหว่าง seed
- PSO แกว่งน้อยมากเพราะค้นหาแค่จำนวนรถ/เวลาเริ่มบน 6 เส้นทางเดิม (search space เล็กกว่า) — เป็นข้อจำกัดของการออกแบบ ไม่ใช่บั๊ก
- ผลตัวเลขเดิมใน commit `ec966d0` ("PSO best on-time 96%") และ `cad2f98` **ไม่ควรใช้อ้างอิงอีก**

## 3. การทดลองลดจำนวนรถ (Fleet Sizing)

สคริปต์: `fleet_experiment.py` → `fleet_experiment_result.json`, `fleet_tradeoff.png`

- SA, budget 500 × 5 seeds ต่อเพดาน N; ถ้าเกินเพดานจะตัดรถจากเส้นทางที่มีรถมากสุด
- Baseline: 6 เส้นทางเดิม กระจายรถ N คันเท่าๆ กัน

| N (เพดาน) | Baseline on-time | SA on-time mean ± std | SA best | SA wait (นาที) |
|---|---|---|---|---|
| 30 | 53.0% | 82.7 ± 23.7% | 100% | 2.3 |
| 24 | 49.5% | 89.1 ± 12.0% | 100% | 4.3 |
| 20 | 40.0% | 52.6 ± 20.0% | 79.5% | 5.5 |
| 18 | 38.0% | 66.2 ± 20.4% | 98.5% | 7.0 |
| 16 | 29.0% | 80.1 ± 21.2% | 100% | 5.3 |
| 14 | 29.0% | 73.9 ± 15.5% | 96.0% | 4.9 |
| 12 | 28.5% | 77.7 ± 21.0% | 100% | 5.3 |
| 10 | 15.0% | 77.4 ± 10.1% | 91.0% | 7.4 |
| 8 | 15.0% | 67.5 ± 17.6% | 82.5% | 13.8 |
| 6 | 15.0% | 41.3 ± 18.8% | 74.5% | 16.1 |

![[fleet_tradeoff.png]]

**ข้อสรุปเบื้องต้น**
- สำหรับ demand ของ CS (400 คน) SA ยังทำ on-time 100% ได้ที่ **12 คัน** (best run) และเวลารอเฉลี่ยยังอยู่ราว 5 นาที → ใช้รถน้อยกว่า baseline 30 คันได้มาก
- ต่ำกว่า **10 คัน** เวลารอเพิ่มชัดเจน (8 คัน ≈ 14 นาที, 6 คัน ≈ 16 นาที) และ on-time ลดลง
- Baseline (เส้นทางเดิม) เสื่อมเร็วกว่ามาก: 10 คัน on-time เหลือ 15% และรอ ~28 นาที
- ค่า std ยังสูง (±10–24%) — ถ้าจะสรุปจุดสมดุลอย่างมั่นใจ ควรเพิ่ม budget หรือจำนวน seed และควรทดลองซ้ำเมื่อขยาย demand เป็นทั้งมหาวิทยาลัย

## 4. วิธีรันซ้ำ

```bash
python cs_benchmark.py
python fleet_experiment.py
```
