# UniFlow EV — งานแผนที่ ป้าย และเส้นทาง: เริ่มอ่านที่นี่

ไฟล์นี้สำหรับคนในทีม และ AI (เช่น Claude Code) ที่จะทำงานต่อจากงานแผนที่บน branch `local/pr1-review` (5–7 พ.ย. 2026)

## งานนี้คืออะไร

ทำให้ **ป้ายรถ ถนน และเส้นทางวิ่งของรถ EV ทั้ง 5 สาย (1A, 1B, 2, 3, 5) ตรงกับข้อมูลจริงของทีม** ได้แก่ รูปบัตรเส้นทางทางการ (`EV/` ใน zip) และพิกัดป้ายจาก Google Maps

**เป้าหมายคือความถูกต้องของแผนที่ ไม่ใช่ผลของ simulation** ผลรันเก่า (`*_result.json`) ยังไม่ได้รันใหม่

## อ่านตามลำดับนี้

1. [`docs/11_Changes_From_GitHub_Main.md`](docs/11_Changes_From_GitHub_Main.md) — **เปลี่ยนอะไรไปจาก GitHub `main`**: ป้ายเดิม 14 ป้ายเป็นอย่างไร สายเก่า 6 สายเทียบกับ 5 สายทางการ ไฟล์ที่เปลี่ยน และรายการป้ายทั้งหมด 74 ป้ายพร้อมพิกัด
2. [`docs/10_Map_Work_Log.md`](docs/10_Map_Work_Log.md) — **ทำอะไรไปทีละขั้น และทำไม**: กติกาที่ทีมกำหนด ลำดับ commit ปัญหาที่เจอ สิ่งที่ยังค้าง
3. [`docs/09_Map_Stops_and_Routes_Guide.md`](docs/09_Map_Stops_and_Routes_Guide.md) — **คู่มือข้อมูลและวิธีใช้**: เปิดดูแผนที่ ความหมายทุกคอลัมน์ วิธีเพิ่ม ย้าย หรือลบป้าย

## เปิดดูแผนที่

```bash
cd web && npm install && npm run dev
```

แล้วเปิด `http://localhost:3000/network` ไม่ต้องรัน Python

## กฎสำคัญ (สำหรับคนและ AI)

- **ต้นฉบับมีแค่ 2 ไฟล์:** `data/raw/stops.csv` (ป้าย) และ `data/raw/routes.json` (สาย) ไฟล์ใน `src/data/*.json` และ `web/src/data/osmNetwork.json` สร้างจากสคริปต์ ห้ามแก้มือ
- **ห้ามรัน `scripts/download_roads.py`** ถ้าไม่ได้ตั้งใจเปลี่ยนข้อมูลถนน ถนนใน OSM อาจเปลี่ยนไปแล้ว แผนที่จะเพี้ยน
- แก้ป้ายแล้วรันตามลำดับ: `scripts/build_osm_distances.py` → `scripts/build_routes.py` → `scripts/export_web_network.py` จากนั้นแก้ชื่อใน `web/src/types/shuttle.ts`
- รันสคริปต์ซ้ำโดยไม่แก้ข้อมูล ต้องไม่มีไฟล์เปลี่ยน (ใช้เช็กว่าเครื่องตัวเองให้ผลเหมือนเดิม)
- ใช้ไลบรารีตามเวอร์ชันใน `requirements.txt` (osmnx 2.1.1, networkx 3.7, shapely 2.2.0)
- ห้ามกลับรถกลางทาง รถจอดทุกป้ายที่วิ่งผ่านบนเลนของตัวเอง (ขับชิดซ้าย) กติกาครบอยู่ใน docs/10 หัวข้อ 2
- **เลขป้ายบนแผนที่ = ลำดับแถวใน `stops.csv`** ป้าย 1 คือจุดพักรถศูนย์ประชุม ลบแถวแล้วเลขป้ายถัดลงไปจะเลื่อน

## สถานะ git

- branch: `local/pr1-review` แยกจาก GitHub `main` ที่ `0dddf32` (31 ต.ค. 2026)
- **ยังไม่ได้ push ขึ้น GitHub** ดู commit ทั้งหมดด้วย `git log origin/main..HEAD`
- GitHub `main` มี `fad0a3e` (3 พ.ย., doc update) ที่ branch นี้ยังไม่มี ตอน merge จะชนกันแค่ `docs/00_Index.md` ให้เก็บทุกแถวไว้
