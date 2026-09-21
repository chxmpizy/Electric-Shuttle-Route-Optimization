# UNIFLOW EV

ระบบต้นแบบสำหรับวิเคราะห์และปรับตารางรถ EV Shuttle ภายในมหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต โดยจำลองการรอรถ การขึ้น-ลงรถ และการเดินรถ จากนั้นค้นหาตารางที่เหมาะสมด้วย Metaheuristic Algorithms

## ความสามารถ

- สร้างกราฟจุดจอดและเส้นทางรถ EV 6 สาย
- จำลองผู้โดยสาร คิว รถ ความจุ และช่วงเวลาให้บริการ
- วัดเวลาเฉลี่ยในการรอรถและเวลาเฉลี่ยในการเดินทาง
- เปรียบเทียบ GA, SA, PSO และ ACO กับ baseline schedule
- สร้างไฟล์ SUMO สำหรับ visual simulation และเปิดดูผ่าน SUMO-GUI

## โครงสร้าง

```text
data/raw/             ข้อมูลรถ ผู้โดยสาร และเส้นทาง
notebooks/            การทดลองและตารางตัวอย่าง
src/data/             โหลดข้อมูล กราฟ และเส้นทางฐาน
src/simulation/       Discrete-event simulation
src/optimization/     fitness, constraint และ evaluator
src/algorithms/       GA, SA, PSO และ ACO
src/models/           SUMO visual simulation
src/visualization/    กราฟเส้นทางและการเปรียบเทียบผล
src/main.py           จุดเริ่มรัน optimization
```

## ติดตั้ง

ต้องใช้ Python 3.10 ขึ้นไป และติดตั้ง dependencies:

```bash
python -m pip install -r requirements.txt
```

สำหรับ SUMO visual simulation ให้ติดตั้ง Eclipse SUMO และตรวจว่า `sumo`, `sumo-gui` และ `netconvert` อยู่ใน `PATH`.

## การรัน

รันการทดลองขนาดเล็กด้วย PSO:

```bash
PYTHONPATH=src python src/main.py --algorithm pso --trials 1
```

เลือก algorithm ได้เป็น `ga`, `sa`, `pso`, `aco` หรือ `all`; สำหรับ GA สามารถลดจำนวนรอบได้:

```bash
PYTHONPATH=src python src/main.py --algorithm ga --trials 1 --generations 5
```

รัน tests:

```bash
PYTHONPATH=src python -m unittest discover -s src/test -v
```

## SUMO visual simulation

สร้าง network ตัวอย่างและเปิด animation:

```bash
PYTHONPATH=src python -m models.sumo --demo --run --gui
```

ไฟล์ที่สร้างอยู่ใน `src/models/sumo_output/`: SUMO network, route file, configuration และ `tripinfo.xml`.

ไฟล์ `src/models/map.osm.xml` เป็นข้อมูล OpenStreetMap ไม่ใช่ SUMO network โดยตรง แม้จะมีชื่อเดิมว่า `thammasat.net.xml`. เมื่อต้องการใช้แผนที่จริง ให้แปลงด้วย `netconvert` แล้วระบุ `sumo_edges` ซึ่งเป็นลำดับ edge ของ SUMO ให้แต่ละ route; ไม่ควรเดาชื่อ edge จากชื่อป้ายรถ.

## สถานะข้อมูลและข้อจำกัด

ตัวจำลองปัจจุบันมี demand model แบบสุ่มตามช่วงเวลาเร่งด่วน เพื่อใช้ทดสอบระบบก่อน ข้อมูลจริงใน `data/raw/student.csv` และ `data/raw/bus.csv` ยังต้องเติมก่อนใช้สรุปผลเชิงปฏิบัติการ. ขั้นตอนถัดไปคือแปลงตารางเรียนของนักศึกษาหอในเป็น passenger demand ตามเวลาและอาคารปลายทาง แล้วปรับเทียบความเร็ว ความจุ และเส้นทางกับข้อมูลหน้างาน.

## Metrics

- `avg_wait_time`: เวลาเฉลี่ยตั้งแต่มาถึงป้ายจนขึ้นรถ
- `avg_travel_time`: เวลาเฉลี่ยหลังขึ้นรถจนลงปลายทาง
- `served_passengers`: จำนวนผู้โดยสารที่ถึงปลายทาง
- `waiting_passengers`: จำนวนผู้โดยสารที่ยังรอเมื่อสิ้นสุดการจำลอง
