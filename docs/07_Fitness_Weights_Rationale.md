---
title: 07. Fitness Weights — Rationale & Sensitivity
tags:
  - project/uniflow-ev
  - documentation
  - advisor-feedback
feedback_ref: "#1 — น้ำหนัก Fitness"
date: 2026-10-20
status: current
sensitivity_data: fitness_sensitivity_result.json
---

# 07. น้ำหนักของ Fitness Function — ที่มา เหตุผล และผลการทดลอง Sensitivity

> ตอบ feedback อาจารย์ข้อ 1: "ต้องอธิบายสูตร น้ำหนัก และเหตุผลในการเลือกตัวชี้วัด"
> พร้อมแก้ประเด็น "น้ำหนัก Fitness ต่างกันระหว่างบทคัดย่อกับวิธีวิจัย (0.3/0.7 vs 0.5/0.5)"

---

## 1. สูตร Fitness ปัจจุบัน

```
cost = W_WAIT   × (avg_wait   / NORM_WAIT)     ← เวลารอเฉลี่ย
     + W_TRAVEL × (avg_travel / NORM_TRAVEL)   ← เวลาเดินทางเฉลี่ย
     + W_DELAY  × (avg_delay  / NORM_DELAY)    ← นาทีที่สายเฉลี่ย
     + PENALTY_UNSERVED × unserved_ratio       ← คนตกค้าง
     + FLEET_COST × total_buses                 ← ต้นทุนฝูง (ปิดอยู่)
```

ไฟล์: [`src/optimization/fitness.py`](../src/optimization/fitness.py)

### ค่าตั้งต้น

| Weight | ค่า | เหตุผลเบื้องต้น |
|---|---|---|
| `W_WAIT` | **0.20** | เวลารอมีผลต่อประสบการณ์ แต่ไม่ตัดสินว่า "ทันเรียน" หรือไม่ |
| `W_TRAVEL` | **0.15** | ไม่เน้นลดเวลาเดินทางมาก เพราะกราฟให้มาแล้ว |
| `W_DELAY` | **0.35** | น้ำหนักสูงสุดในกลุ่ม quality — สายคือ feedback ตรง |
| `PENALTY_UNSERVED` | **60.0** | หนักกว่าเวลารอ ~300x — คนตกค้างต้องเลี่ยงให้สุด |
| `FLEET_COST` | **0.0** | ปิดอยู่ จนกว่าจะมีข้อมูลต้นทุน (บาท/คัน-ชม.) |

### Normalization

| Const | ค่า (นาที) | หมายเหตุ |
|---|---|---|
| `NORM_WAIT` | 15 | เวลารอ "ยอมรับได้" |
| `NORM_TRAVEL` | 20 | เวลาเดินทาง "ยอมรับได้" |
| `NORM_DELAY` | 10 | นาทีสาย "ยอมรับได้" |

Normalization ทำให้แต่ละ term อยู่ในสเกลเดียวกัน (0–1 เมื่อค่าใกล้ "ยอมรับได้")
น้ำหนักจึงเทียบได้ตรง ๆ

---

## 2. ลำดับความสำคัญ (ที่น้ำหนักควรสะท้อน)

ตามเจตนาเดิม:

1. **คนไม่ตกค้าง** (PENALTY_UNSERVED=60 — หนักสุด)
2. **คนเข้าเรียนทัน** (W_DELAY=0.35 — อันดับสองในกลุ่ม quality)
3. **เวลารอน้อย** (W_WAIT=0.20)
4. **เวลาเดินทางน้อย** (W_TRAVEL=0.15 — น้อยสุด เพราะกราฟให้แล้ว ลดได้จำกัด)

> **จุดสำคัญ:** น้ำหนัก **wait/travel/delay** รวมกัน = 0.70, ส่วน `PENALTY_UNSERVED` ตั้งแบบแยก (ไม่ normalize) เพื่อให้คนตกค้างมี impact มหาศาลเสมอ

---

## 3. Sensitivity Analysis — ทดลองน้ำหนัก 8 แบบ

### 3.1 Setup

- **Demand:** CS pilot 400 คน (คงที่)
- **Algorithm:** GA 10 generations (คงที่)
- **Seed:** 42 (คงที่)
- **ตัวแปร:** ปรับเฉพาะ `W_WAIT / W_TRAVEL / W_DELAY`
  (คง `PENALTY_UNSERVED=60`, `NORM_*`, และ GA hyperparams)
- **สคริปต์:** [`fitness_sensitivity.py`](../fitness_sensitivity.py)
- **ผลดิบ:** [`fitness_sensitivity_result.json`](../fitness_sensitivity_result.json)

### 3.2 ผลการทดลอง

| Config | W_WAIT | W_TRAVEL | W_DELAY | **On-Time %** | Stranded | Delay (m) | Wait (m) | Buses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A: **current** | 0.20 | 0.15 | 0.35 | 64.5 | 0 | 4.0 | 1.8 | 28 |
| B: equal | 0.33 | 0.33 | 0.33 | 64.5 | 0 | 4.0 | 1.8 | 28 |
| **C: delay-only** | 0.00 | 0.00 | **1.00** | **90.5** ⭐ | 0 | **1.6** | 3.1 | 28 |
| D: wait-heavy | 0.50 | 0.10 | 0.10 | 64.5 | 0 | 4.0 | 1.8 | 28 |
| E: travel-heavy | 0.10 | 0.50 | 0.10 | 18.0 ❌ | 0 | 29.2 | 26.4 | 21 |
| **F: paper abstract** | 0.30 | 0.00 | **0.70** | **90.5** ⭐ | 0 | **1.6** | 3.1 | 28 |
| G: paper methodology | 0.50 | 0.00 | 0.50 | 64.5 | 0 | 4.0 | 1.8 | 28 |
| H: delay-dominant | 0.10 | 0.10 | 0.60 | 71.5 | 0 | 8.9 | 2.9 | 29 |

### 3.3 ข้อสังเกตสำคัญ

**🟢 ชัดเจน:** น้ำหนัก delay ที่สูง (>0.6) ให้ **on-time rate ดีขึ้นชัดเจน** (90.5% vs 64.5%)
- Config **C (0/0/1.0)** และ **F (0.3/0/0.7)** ให้ผลดีที่สุด
- Delay เฉลี่ยลดจาก 4.0 → 1.6 นาที (ลด 60%)
- Trade-off: wait เพิ่มเล็กน้อย 1.8 → 3.1 นาที (เพิ่ม 72% แต่ยังอยู่ในระดับยอมรับได้)

**🔴 อันตราย:** **E (travel-heavy)** — on-time ร่วงเหลือ 18% delay พุ่ง 29 นาที
- GA ค้นเจอเส้นทางสั้น (ลด travel time) แต่ตัดป้ายที่สำคัญทิ้ง → คนไปเรียนไม่ทัน
- บทเรียน: การ minimize travel time อย่างเดียวโดยไม่คุม delay = **อันตราย**

**🟡 น่าสนใจ:** Config **A, B, D, G** ได้ผลลัพธ์เหมือนกันหมด (64.5%, buses=28)
- แม้น้ำหนักต่างกัน แต่ GA ค้นเจอ chromosome เดียวกัน
- สาเหตุน่าจะเป็นว่า `PENALTY_UNSERVED=60` ครอบงำการตัดสินใจ (ตอน GA ค้นเจอเส้นทางที่ให้ unserved=0 ก็ถือว่าเจอ optimum)
- น้ำหนัก wait/travel/delay มีผลเฉพาะเมื่อ **ลด unserved จนถึงจุดอิ่มตัวแล้ว**

---

## 4. ข้อสรุปและคำแนะนำ

### 4.1 ประเด็น 0.3/0.7 vs 0.5/0.5 ใน paper ของทีม

Paper ที่ทีมเขียน (`CS303_Report_68-2_29_pps-r2.pdf`) ยังมี **inconsistency**:
- **บทคัดย่อ:** น้ำหนัก 0.3 (wait) / 0.7 (delay)
- **วิธีวิจัย:** น้ำหนัก 0.5 (wait) / 0.5 (delay)
- **โค้ดจริง:** 0.20 / 0.15 / 0.35 (3-way split รวม wait + travel + delay)

**คำแนะนำ:** แก้ paper ให้ตรงกัน **1 ชุดเท่านั้น** ที่ตรงกับโค้ดและผลทดลอง

### 4.2 คำแนะนำ: ควรเปลี่ยนน้ำหนักไหม

จาก sensitivity ชัดเจนว่า **delay-weighted (0.3/0.0/0.7 หรือ 0.1/0.1/0.6)** ให้ผลดีกว่าปัจจุบัน

| สมมติฐาน | ปัจจุบัน (A) | ที่แนะนำ (F) | เปลี่ยนแปลง |
|---|---:|---:|---:|
| On-time % | 64.5 | **90.5** | **+26 ppt** |
| Delay (min) | 4.0 | 1.6 | −60% |
| Wait (min) | 1.8 | 3.1 | +72% (ยอมรับได้) |
| Buses | 28 | 28 | เท่าเดิม |

**ข้อเสนอ 2 ทาง:**

**ทาง 1 (ปลอดภัย):** ใช้ `0.10 / 0.10 / 0.60` (Config H)
- ยังเก็บ wait/travel ไว้ไม่ให้ GA ไปปรับเกิน
- On-time 71.5% (ดีขึ้น 7 ppt)

**ทาง 2 (ตามผลทดลอง):** ใช้ `0.30 / 0.00 / 0.70` (Config F — ตรงกับบทคัดย่อของ paper)
- ตัด travel ออก (เพราะ norm แล้วไม่มีผล)
- On-time 90.5% (ดีขึ้น 26 ppt)
- ตรงกับที่บทคัดย่อ paper เสนอ

### 4.3 ข้อจำกัดของการทดลอง

1. **GA เพียง 10 generations** — การค้นเจอ optimum ไม่สมบูรณ์
2. **1 seed เท่านั้น** — ไม่ยืนยัน variance
3. **เฉพาะ GA** — ไม่ได้ test กับ SA/PSO/ACO
4. **CS pilot เท่านั้น** — demand size 400 คน, ควรทดลองกับ dataset ใหญ่ขึ้น

การทดลองเพิ่มเติมในอนาคต:
- รัน sensitivity กับทุก algorithm (4 ตัว × 8 configs × 3 seeds = 96 runs)
- เพิ่ม config granularity (เช่น sweep W_DELAY: 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
- ทดลองเปลี่ยน `NORM_*` และ `PENALTY_UNSERVED` ด้วย

---

## 5. ที่มาของแนวคิด Normalization + Weighted Sum

### 5.1 เอกสารอ้างอิง

- **Díaz-Ramírez et al. (2022)** §3.2 ใช้ **lexicographic goal programming** — ไม่ใช่ weighted sum
- Paper จัดลำดับ 4 เป้าหมาย: unserved, early-arrival, bus count, re-assignment
- Normalize ด้วย "ค่าที่ยอมรับได้" (acceptable value)

### 5.2 ทำไมเราไม่ใช้ lexicographic

- **ง่ายกว่า:** weighted sum เป็น scalar ตัวเดียว ส่ง GA ได้ตรง
- **เพียงพอ:** PENALTY_UNSERVED=60 บวก normalize แล้ว ให้ priority 1 (unserved) ครอบงำได้พอ ๆ กับ lexicographic
- **ปรับง่าย:** ปรับ W_* และ PENALTY ได้ด้วย sensitivity

> **หมายเหตุ:** ถ้า advisor อยากให้ตรง paper 100% ต้องเปลี่ยนเป็น lexicographic ซึ่งจะ:
> - ซับซ้อนขึ้น (ต้อง resolve tie ตามลำดับ)
> - GA search space เปลี่ยน (ต้อง rebuild selection logic)
> - อาจไม่ดีขึ้นในทางปฏิบัติ

---

## 6. Checklist สิ่งที่ต้องทำ (ก่อนส่งเล่ม)

- [x] ทำ sensitivity analysis — ✅ ผลใน `fitness_sensitivity_result.json`
- [x] เปรียบเทียบน้ำหนัก paper (0.3/0.7, 0.5/0.5) กับโค้ดจริง — ✅ แล้ว
- [ ] **ตัดสินใจน้ำหนักสุดท้าย** (A, F, หรือ H)
- [ ] อัปเดต `src/optimization/fitness.py` ถ้าเปลี่ยน
- [ ] อัปเดต paper ให้บทคัดย่อ+วิธีวิจัย+โค้ดใช้ชุดเดียวกัน
- [ ] รัน `cs_benchmark.py` ใหม่ด้วยน้ำหนักใหม่ (ถ้าเปลี่ยน) → ได้ผล baseline ที่ตรงกับเล่ม
- [ ] (ต่อยอด) ทำ sensitivity กับทุก algorithm — ตอนเสร็จงาน core

---

## 7. อ้างอิง

- Díaz-Ramírez et al. (2022). *A smart school routing and scheduling problem for the new normalcy.* Computers & Industrial Engineering, 168, 108101.
- `src/optimization/fitness.py` — current implementation
- `fitness_sensitivity.py` — sensitivity script
- `fitness_sensitivity_result.json` — raw results
