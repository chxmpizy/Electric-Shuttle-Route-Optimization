"""Generate UniFlow EV progress-update slides (10 slides, 16:9) as .pptx."""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

OUT_PATH = Path(__file__).resolve().parent.parent / "UniFlow_EV_Update_Slides.pptx"

FONT_HEAD = "Sukhumvit Set"
FONT_BODY = "Sukhumvit Set"
FONT_MONO = "Menlo"

COLOR_BG = RGBColor(0xF7, 0xF9, 0xFC)
COLOR_PRIMARY = RGBColor(0x0B, 0x3D, 0x91)
COLOR_ACCENT = RGBColor(0x1F, 0xA2, 0x5F)
COLOR_WARN = RGBColor(0xC0, 0x39, 0x2B)
COLOR_SUB = RGBColor(0x55, 0x6B, 0x7D)
COLOR_TEXT = RGBColor(0x1C, 0x1E, 0x21)
COLOR_SIDEBAR = RGBColor(0x0B, 0x3D, 0x91)
COLOR_WHITE = RGBColor(0xFF, 0xFF, 0xFF)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


def set_run(run, size, bold=False, color=COLOR_TEXT, font=FONT_BODY):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_background(slide, color=COLOR_BG):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = color
    bg.line.fill.background()
    bg.shadow.inherit = False
    return bg


def add_sidebar(slide):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.35), SLIDE_H)
    bar.fill.solid()
    bar.fill.fore_color.rgb = COLOR_SIDEBAR
    bar.line.fill.background()
    bar.shadow.inherit = False


def add_footer(slide, slide_no, total=10):
    tx = slide.shapes.add_textbox(Inches(0.6), Inches(7.05), Inches(12), Inches(0.35))
    tf = tx.text_frame
    tf.margin_left = tf.margin_right = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = f"UniFlow EV  ·  CS303 Senior Project  ·  Advisor: ผศ.ดร.ปกป้อง ส่องเมือง"
    set_run(r, 10, color=COLOR_SUB)

    tx2 = slide.shapes.add_textbox(Inches(11.5), Inches(7.05), Inches(1.5), Inches(0.35))
    tf2 = tx2.text_frame
    tf2.margin_left = tf2.margin_right = 0
    p2 = tf2.paragraphs[0]
    p2.alignment = PP_ALIGN.RIGHT
    r2 = p2.add_run()
    r2.text = f"{slide_no} / {total}"
    set_run(r2, 10, bold=True, color=COLOR_PRIMARY)


def add_title(slide, title, subtitle=None, top=Inches(0.55)):
    tbox = slide.shapes.add_textbox(Inches(0.7), top, Inches(12.3), Inches(0.85))
    tf = tbox.text_frame
    tf.margin_left = tf.margin_top = tf.margin_bottom = 0
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = title
    set_run(r, 32, bold=True, color=COLOR_PRIMARY, font=FONT_HEAD)

    if subtitle:
        sb = slide.shapes.add_textbox(Inches(0.7), top + Inches(0.85), Inches(12.3), Inches(0.5))
        sf = sb.text_frame
        sf.margin_left = sf.margin_top = sf.margin_bottom = 0
        sf.word_wrap = True
        sp = sf.paragraphs[0]
        sr = sp.add_run()
        sr.text = subtitle
        set_run(sr, 16, color=COLOR_SUB, font=FONT_HEAD)


def add_body_bullets(slide, items, left=Inches(0.8), top=Inches(2.1),
                     width=Inches(11.8), height=Inches(4.6), size=16,
                     line_spacing=1.25):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.margin_left = tf.margin_top = 0
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.line_spacing = line_spacing
        p.space_after = Pt(4)
        if isinstance(item, tuple):
            text, bold, color = item
        else:
            text, bold, color = item, False, COLOR_TEXT
        r = p.add_run()
        r.text = text
        set_run(r, size, bold=bold, color=color)
    return box


def add_pill(slide, left, top, width, height, text, bg_color, text_color=COLOR_WHITE,
             size=12, bold=True):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.fill.background()
    shape.shadow.inherit = False
    tf = shape.text_frame
    tf.margin_left = Inches(0.1)
    tf.margin_right = Inches(0.1)
    tf.margin_top = tf.margin_bottom = 0
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = text
    set_run(r, size, bold=bold, color=text_color, font=FONT_HEAD)


def add_card(slide, left, top, width, height, header, body_lines,
             header_color=COLOR_PRIMARY):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_WHITE
    card.line.color.rgb = RGBColor(0xDE, 0xE4, 0xEC)
    card.line.width = Pt(0.75)
    card.shadow.inherit = False

    hbox = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15),
                                    width - Inches(0.4), Inches(0.45))
    tf = hbox.text_frame
    tf.margin_left = tf.margin_top = 0
    tf.word_wrap = True
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = header
    set_run(r, 15, bold=True, color=header_color, font=FONT_HEAD)

    bbox = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.65),
                                    width - Inches(0.4), height - Inches(0.8))
    bf = bbox.text_frame
    bf.margin_left = bf.margin_top = 0
    bf.word_wrap = True
    for i, line in enumerate(body_lines):
        p = bf.paragraphs[0] if i == 0 else bf.add_paragraph()
        p.line_spacing = 1.2
        p.space_after = Pt(3)
        r = p.add_run()
        r.text = line
        set_run(r, 12, color=COLOR_TEXT)


# ---------- Build slides ----------

def slide1_cover(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    # Full-bleed primary background
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = COLOR_PRIMARY
    bg.line.fill.background()
    bg.shadow.inherit = False

    # Accent bar
    bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.1),
                             Inches(1.4), Inches(0.1))
    bar.fill.solid()
    bar.fill.fore_color.rgb = COLOR_ACCENT
    bar.line.fill.background()
    bar.shadow.inherit = False

    # Kicker
    k = s.shapes.add_textbox(Inches(0.8), Inches(1.5), Inches(10), Inches(0.6))
    kp = k.text_frame.paragraphs[0]
    kr = kp.add_run()
    kr.text = "CS303 SENIOR PROJECT  ·  PROGRESS UPDATE"
    set_run(kr, 14, bold=True, color=COLOR_ACCENT, font=FONT_HEAD)

    # Title
    t = s.shapes.add_textbox(Inches(0.8), Inches(2.4), Inches(11.5), Inches(1.4))
    tf = t.text_frame
    tf.word_wrap = True
    tp = tf.paragraphs[0]
    tr = tp.add_run()
    tr.text = "UniFlow EV"
    set_run(tr, 64, bold=True, color=COLOR_WHITE, font=FONT_HEAD)

    sub = s.shapes.add_textbox(Inches(0.8), Inches(3.6), Inches(11.5), Inches(1.0))
    sf = sub.text_frame
    sf.word_wrap = True
    sp = sf.paragraphs[0]
    sr = sp.add_run()
    sr.text = "อัปเดตความคืบหน้าตามข้อเสนอแนะอาจารย์"
    set_run(sr, 28, color=COLOR_WHITE, font=FONT_HEAD)

    sub2 = s.shapes.add_textbox(Inches(0.8), Inches(4.3), Inches(11.5), Inches(0.6))
    sp2 = sub2.text_frame.paragraphs[0]
    sr2 = sp2.add_run()
    sr2.text = "Electric Shuttle Route & Fleet Scheduling Optimization — TU Rangsit"
    set_run(sr2, 16, color=RGBColor(0xCF, 0xDA, 0xF0), font=FONT_HEAD)

    # Author block
    a = s.shapes.add_textbox(Inches(0.8), Inches(5.4), Inches(11.5), Inches(1.7))
    af = a.text_frame
    af.word_wrap = True
    lines = [
        ("Rattasat Onnomdee (6509650229)", False),
        ("Nontapat Rangubthuk (6509650534)", False),
        ("Advisor: ผศ.ดร.ปกป้อง ส่องเมือง", False),
        ("28 October 2026", True),
    ]
    for i, (text, bold) in enumerate(lines):
        p = af.paragraphs[0] if i == 0 else af.add_paragraph()
        p.line_spacing = 1.25
        r = p.add_run()
        r.text = text
        set_run(r, 15, bold=bold, color=COLOR_WHITE)


def slide2_scope(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "Scope ของการ Update", "แก้ตาม Feedback 11 ข้อของอาจารย์ (เน้น 4 ข้อหลัก) + ส่วนที่เราเพิ่มเอง")

    rows = [
        ("DONE", "#1  วิธีคิดเวลา & Punctuality", "คำนวณถึงอาคาร + สายกี่คน/กี่นาที", COLOR_ACCENT),
        ("DONE", "#2  Input ตรวจย้อนกลับได้", "ตารางเรียน CS, GPS จริง, สมมติฐานมีที่มา", COLOR_ACCENT),
        ("DONE", "#3  Multi-Objective Fitness", "ลงโทษคนตกค้าง + สายเข้าเรียน", COLOR_ACCENT),
        ("DONE", "#4  Fair Benchmark + Replication", "3 seeds, budget เท่ากัน, decision vars เดียวกัน", COLOR_ACCENT),
        ("WIP",  "#6  Fleet Reduction",  "Phase 5 — Trade-off Fleet vs On-time", COLOR_WARN),
        ("WIP",  "#7  SUMO Person/Ride", "Phase 6 — ตรวจเทียบ tripinfo.xml", COLOR_WARN),
        ("NEW",  "+  Fitness Sensitivity · Second Brain Docs · Web Dashboard · SUMO-GUI บน Mac", "ส่วนที่คิดและทำเองนอกเหนือจากที่อาจารย์ขอ", COLOR_PRIMARY),
    ]

    top = Inches(2.0)
    row_h = Inches(0.62)
    for i, (badge, title, note, color) in enumerate(rows):
        y = top + row_h * i
        add_pill(s, Inches(0.8), y + Inches(0.1), Inches(0.9), Inches(0.4),
                 badge, color, size=11)
        tb = s.shapes.add_textbox(Inches(1.85), y + Inches(0.03), Inches(10.9),
                                  Inches(0.6))
        tf = tb.text_frame
        tf.margin_left = tf.margin_top = 0
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        r1 = p1.add_run()
        r1.text = title
        set_run(r1, 15, bold=True, color=COLOR_TEXT, font=FONT_HEAD)
        p2 = tf.add_paragraph()
        r2 = p2.add_run()
        r2.text = note
        set_run(r2, 11, color=COLOR_SUB)

    add_footer(s, 2)


def slide3_demand(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "Feedback #1 + #2 → Timetable-Driven Demand",
              "เลิก “สุ่มคนตาม STOP_WEIGHTS” → ใช้ตารางเรียน CS จริง")

    # Left column: narrative
    add_body_bullets(s, [
        ("ก่อนปรับปรุง:", True, COLOR_WARN),
        "• สุ่ม origin/destination จาก STOP_WEIGHTS",
        "• ไม่สะท้อนพฤติกรรมจริง",
        "",
        ("หลังปรับปรุง:", True, COLOR_ACCENT),
        "• อ่าน data/raw/cs_timetable.xlsx",
        "• สร้าง PassengerDemand ตามคาบจริง",
        "• Map อาคาร → ป้าย อัตโนมัติ",
        "• วิชาจำกัดเซค 50 คน / วิชาทั่วไป 120 คน",
    ], left=Inches(0.8), top=Inches(2.1), width=Inches(5.9), height=Inches(4.6),
       size=14)

    # Right column: dataset cards
    add_card(s, Inches(7.0), Inches(2.1), Inches(5.6), Inches(2.1),
             "ชุด Pilot (ใช้งานแล้ว)",
             [
                 "400 คน × 2 วัน",
                 "วิชา: CS100 · CS211 · CS212 · CS213",
                 "คาบ: 08:00 · 09:30 · 13:00",
                 "ปลายทาง: Lecture, SC2_SC3",
             ], header_color=COLOR_ACCENT)

    add_card(s, Inches(7.0), Inches(4.4), Inches(5.6), Inches(2.3),
             "ชุด Full-Scale (กำลังทดสอบ)",
             [
                 "16,050 คน",
                 "แยก: จำกัดเซค 5,850 + ทั่วไป 10,200",
                 "ครอบคลุมทุกคาบใน Timetable",
                 "ใช้ validate ว่าระบบรับ demand ใหญ่ได้",
             ], header_color=COLOR_WARN)

    add_footer(s, 3)


def slide4_punctuality(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "Feedback #1 → Punctuality Model",
              "คำนวณเวลาถึงอาคาร + ประเมิน “ทัน / สาย” รายคน")

    # Formula box
    fbox = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8),
                              Inches(2.0), Inches(11.7), Inches(1.9))
    fbox.fill.solid()
    fbox.fill.fore_color.rgb = COLOR_WHITE
    fbox.line.color.rgb = RGBColor(0xDE, 0xE4, 0xEC)
    fbox.shadow.inherit = False

    ft = s.shapes.add_textbox(Inches(1.0), Inches(2.1), Inches(11.3), Inches(1.7))
    tf = ft.text_frame
    tf.margin_left = tf.margin_top = 0
    tf.word_wrap = True
    lines = [
        ("สูตรใหม่ (unified):", True, COLOR_PRIMARY, 14, FONT_HEAD),
        ("เวลาถึงอาคาร  =  drop_time  +  walk_time_minutes", False, COLOR_TEXT, 15, FONT_MONO),
        ("delay_minutes  =  max(0,  เวลาถึงอาคาร  −  class_start_time)", False, COLOR_TEXT, 15, FONT_MONO),
        ("is_on_time    =  เวลาถึงอาคาร  ≤  class_start_time  −  ARRIVE_BEFORE (10′)", False, COLOR_TEXT, 15, FONT_MONO),
    ]
    for i, (text, bold, color, size, font) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = 1.25
        p.space_after = Pt(2)
        r = p.add_run()
        r.text = text
        set_run(r, size, bold=bold, color=color, font=font)

    # Lower cards
    add_card(s, Inches(0.8), Inches(4.1), Inches(5.9), Inches(2.6),
             "เวลาเดินจากป้ายถึงอาคาร (walk_time)",
             [
                 "Library  →  2 นาที",
                 "Lecture (LC1–LC5)  →  3 นาที",
                 "Social · Convention  →  3 นาที",
                 "SC2_SC3  →  4 นาที",
                 "SC1 · Health  →  5 นาที",
                 "วัดจาก Google Maps + ความเร็วเดิน 1.2 m/s",
             ])
    add_card(s, Inches(6.85), Inches(4.1), Inches(5.75), Inches(2.6),
             "ตอบคำถามอาจารย์ได้ครบ",
             [
                 "• ทันกี่คน  (is_on_time == True)",
                 "• สายกี่คน  (delay_minutes > 0)",
                 "• สายเฉลี่ยกี่นาที  (avg_delay)",
                 "• ตกค้างกี่คน  (unserved count)",
                 "ARRIVE_BEFORE = 10′ (Comfort Early Bound)",
             ], header_color=COLOR_ACCENT)

    add_footer(s, 4)


def slide5_fitness(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "Feedback #3 → Multi-Objective Fitness",
              "เลิก 0.5·wait + 0.5·travel ที่หลอกตา — ลงโทษคนตกค้างและสาย")

    # Formula strip
    fbox = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8),
                              Inches(2.0), Inches(11.7), Inches(1.1))
    fbox.fill.solid()
    fbox.fill.fore_color.rgb = COLOR_PRIMARY
    fbox.line.fill.background()
    fbox.shadow.inherit = False

    ft = s.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(11.3), Inches(0.75))
    tf = ft.text_frame
    tf.margin_left = tf.margin_top = 0
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = "Cost  =  w₁·Wait  +  w₂·Travel  +  w₃·Delay  +  P·Unserved  +  C·Fleet"
    set_run(r, 20, bold=True, color=COLOR_WHITE, font=FONT_MONO)

    # Weights table
    weights = [
        ("W_WAIT",            "0.20",   "UX ของผู้โดยสาร — รอน่ารำคาญ แต่ไม่ตัดสินทัน", COLOR_TEXT),
        ("W_TRAVEL",          "0.15",   "น้อยสุด — graph ให้แล้ว ลดได้จำกัด",            COLOR_TEXT),
        ("W_DELAY",           "0.35",   "สูงสุดใน quality group — สาย = feedback ตรง", COLOR_ACCENT),
        ("PENALTY_UNSERVED",  "60.0",   "~300× ของ wait — ปล่อยคนตกค้าง = คะแนนพัง",   COLOR_WARN),
        ("FLEET_COST",        "0.0",    "ปิดอยู่ (รอข้อมูลต้นทุนบาท/คัน-ชม.)",            COLOR_SUB),
    ]
    top = Inches(3.4)
    for i, (name, val, note, color) in enumerate(weights):
        y = top + Inches(0.55) * i
        # Name
        n = s.shapes.add_textbox(Inches(0.9), y, Inches(3.0), Inches(0.45))
        np_ = n.text_frame.paragraphs[0]
        nr = np_.add_run()
        nr.text = name
        set_run(nr, 14, bold=True, color=COLOR_PRIMARY, font=FONT_MONO)
        # Value
        v = s.shapes.add_textbox(Inches(3.9), y, Inches(1.4), Inches(0.45))
        vp = v.text_frame.paragraphs[0]
        vp.alignment = PP_ALIGN.RIGHT
        vr = vp.add_run()
        vr.text = val
        set_run(vr, 15, bold=True, color=color, font=FONT_MONO)
        # Note
        nt = s.shapes.add_textbox(Inches(5.5), y, Inches(7.1), Inches(0.45))
        ntp = nt.text_frame.paragraphs[0]
        ntr = ntp.add_run()
        ntr.text = note
        set_run(ntr, 13, color=COLOR_TEXT)

    # Footer insight
    ins = s.shapes.add_textbox(Inches(0.8), Inches(6.5), Inches(11.8), Inches(0.5))
    ip = ins.text_frame.paragraphs[0]
    ir = ip.add_run()
    ir.text = "ผลลัพธ์: ไม่มีทางหลอกฟิตเนสด้วยการ “ทิ้งคนที่ป้าย” ได้อีก — ทุก unserved จะดันคะแนนสูงทันที"
    set_run(ir, 13, bold=True, color=COLOR_WARN)

    add_footer(s, 5)


def slide6_benchmark(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "Feedback #4 → Fair Benchmark",
              "ค้นหาบนสนามเดียวกัน + ทำซ้ำได้ (Reproducible)")

    cards = [
        ("1. Decision Vars มาตรฐาน",
         ["Headway (ความถี่รอบรถ)",
          "Fleet size per route",
          "Start time ปล่อยรถคันแรก",
          "ทุก algorithm ค้นหาบนตัวแปรชุดเดียวกัน"]),
        ("2. Replication 3 Seeds",
         ["Seeds: [42, 123, 456]",
          "รายงาน Mean / Best / Worst",
          "ยืนยันผลไม่ใช่ความบังเอิญ",
          "ตรวจ variance ของแต่ละ algo"]),
        ("3. Budget เท่ากัน",
         ["GA: 15 generations",
          "SA: 200 iterations",
          "PSO: 30 iterations",
          "ACO: 20 iters × 10 ants"]),
        ("4. Reproducibility",
         ["Demand คงที่ตลอด search",
          "บันทึก hyperparam + platform",
          "cs_benchmark_result.json",
          "Clone → รัน → ได้ผลเดิม"]),
    ]
    positions = [
        (Inches(0.8),  Inches(2.1)),
        (Inches(6.85), Inches(2.1)),
        (Inches(0.8),  Inches(4.65)),
        (Inches(6.85), Inches(4.65)),
    ]
    for (title, lines), (x, y) in zip(cards, positions):
        add_card(s, x, y, Inches(5.75), Inches(2.3), title, lines)

    add_footer(s, 6)


def slide7_inputs(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "Feedback #4 (Input) → Audit-able Assumptions",
              "แยก Input 3 ประเภทพร้อมแหล่งอ้างอิง — ทุกตัวเลขอธิบายได้ว่า “มาจากไหน”")

    data = [
        ("REAL  ·  ข้อมูลจริง", COLOR_ACCENT,
         ["ตารางเรียน CS (cs_timetable.xlsx)",
          "พิกัด GPS 14 ป้าย (OSM + Google Maps)",
          "จำนวน นศ./คณะ (สำนักทะเบียน 2567)",
          "ขอบเขตเวลา 06:00–21:00"]),
        ("INFERRED  ·  คำนวณจากข้อมูลจริง", COLOR_PRIMARY,
         ["เวลาเดินทาง = Haversine ÷ 50 km/h",
          "Cycle = Σ segment + dwell + layover",
          "เวลามาถึงป้าย = class − walk − travel − buffer",
          "On-time rate = ถึงอาคารก่อน (start − 10′)"]),
        ("ASSUMED  ·  สมมติฐาน", COLOR_WARN,
         ["Buffer 10′ · Walk 2–5′ · Dwell 1.5′ · Layover 5′",
          "Section size 50 / 120 คน",
          "bus_capacity 30 · ความเร็ว 50 km/h",
          "อ้างอิง Díaz-Ramírez (2022)"]),
    ]
    top = Inches(2.1)
    card_h = Inches(1.5)
    for i, (header, color, lines) in enumerate(data):
        y = top + (card_h + Inches(0.15)) * i
        card = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8),
                                  y, Inches(11.7), card_h)
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_WHITE
        card.line.color.rgb = RGBColor(0xDE, 0xE4, 0xEC)
        card.shadow.inherit = False
        # Header strip
        add_pill(s, Inches(1.0), y + Inches(0.17), Inches(3.3), Inches(0.42),
                 header, color, size=12)
        # Body
        bb = s.shapes.add_textbox(Inches(4.5), y + Inches(0.17), Inches(7.9),
                                  card_h - Inches(0.2))
        bf = bb.text_frame
        bf.margin_left = bf.margin_top = 0
        bf.word_wrap = True
        for j, line in enumerate(lines):
            p = bf.paragraphs[0] if j == 0 else bf.add_paragraph()
            p.line_spacing = 1.15
            r = p.add_run()
            r.text = f"•  {line}"
            set_run(r, 12, color=COLOR_TEXT)

    add_footer(s, 7)


def slide8_extras(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "สิ่งที่เราเพิ่มเติม  (Beyond Advisor Feedback)",
              "ส่วนที่คิดและทำเองนอกเหนือจากที่อาจารย์ขอ เพื่อยกคุณภาพโครงงาน")

    items = [
        ("①", "Fitness Sensitivity 8 Configs",
         "ทดลองน้ำหนัก 8 แบบ ตอบปม 0.3/0.7 vs 0.5/0.5 ใน paper ด้วยหลักฐานเชิงประจักษ์ (Config F: on-time 90.5%)"),
        ("②", "Second Brain Documentation",
         "เอกสาร 7 ชุด (00–07) โครงสร้าง PARA เชื่อม Feedback ↔ โค้ด ↔ Checklist ตรวจความพร้อม"),
        ("③", "Interactive Web Dashboard",
         "Leaflet Map + Recharts + ตารางเดินรถสไตล์ป้ายรถเมล์ญี่ปุ่น + ปุ่ม Run Benchmark จาก UI"),
        ("④", "SUMO-GUI บน Mac / XQuartz",
         "แก้ path resolution ของ Anaconda ให้รันผ่าน FastAPI endpoint ได้ไม่แครช"),
        ("⑤", "Haversine Auto-Calc ระยะทาง",
         "คำนวณระยะทางระหว่างป้ายจาก GPS จริง — ไม่ต้อง hardcode / mock"),
    ]

    top = Inches(2.1)
    row_h = Inches(0.9)
    for i, (num, title, desc) in enumerate(items):
        y = top + row_h * i
        # Number badge
        badge = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.9), y + Inches(0.08),
                                   Inches(0.65), Inches(0.65))
        badge.fill.solid()
        badge.fill.fore_color.rgb = COLOR_ACCENT
        badge.line.fill.background()
        badge.shadow.inherit = False
        btf = badge.text_frame
        btf.margin_left = btf.margin_top = 0
        bp = btf.paragraphs[0]
        bp.alignment = PP_ALIGN.CENTER
        br = bp.add_run()
        br.text = num
        set_run(br, 20, bold=True, color=COLOR_WHITE, font=FONT_HEAD)
        # Title & desc
        tb = s.shapes.add_textbox(Inches(1.75), y, Inches(11.0), Inches(0.85))
        tf = tb.text_frame
        tf.margin_left = tf.margin_top = 0
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        r1 = p1.add_run()
        r1.text = title
        set_run(r1, 16, bold=True, color=COLOR_PRIMARY, font=FONT_HEAD)
        p2 = tf.add_paragraph()
        p2.line_spacing = 1.15
        r2 = p2.add_run()
        r2.text = desc
        set_run(r2, 12, color=COLOR_TEXT)

    add_footer(s, 8)


def slide9_results(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "ผลเบื้องต้น + ปัญหาที่พบ",
              "CS Pilot (400 คน) ผ่านฉลุย — Full-Scale (16,050 คน) ชี้ bottleneck ใหม่")

    # Left: Pilot (success)
    add_card(s, Inches(0.8), Inches(2.1), Inches(5.9), Inches(3.0),
             "CS Pilot — 400 คน",
             [
                 "Baseline on-time:  53.0%",
                 "GA (best):  on-time 100% (seed 123)",
                 "GA mean on-time:  86.7%",
                 "ACO best:  87.8% ด้วย 17 คัน",
                 "ยืนยันตรรกะ timing + punctuality ทำงานถูก",
             ], header_color=COLOR_ACCENT)

    # Right: Full-scale (issues)
    add_card(s, Inches(6.85), Inches(2.1), Inches(5.75), Inches(3.0),
             "CS Full-Scale — 16,050 คน (กำลังรัน)",
             [
                 "Baseline on-time:  5.2%  ·  Stranded 5,360",
                 "GA 3 seeds score เท่ากันเป๊ะ (7.62)",
                 "GA mean on-time:  6.9%",
                 "SA เกือบไม่ขยับจาก baseline (~29)",
                 "PSO / ACO ยังรันไม่เสร็จ",
             ], header_color=COLOR_WARN)

    # Insights strip
    ib = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.3),
                            Inches(11.7), Inches(1.5))
    ib.fill.solid()
    ib.fill.fore_color.rgb = RGBColor(0xFF, 0xF4, 0xE5)
    ib.line.color.rgb = RGBColor(0xF2, 0xC9, 0x7D)
    ib.shadow.inherit = False

    it = s.shapes.add_textbox(Inches(1.0), Inches(5.4), Inches(11.3), Inches(1.3))
    tf = it.text_frame
    tf.margin_left = tf.margin_top = 0
    tf.word_wrap = True
    lines = [
        ("Key Insights จาก Full-Scale Run:", True, COLOR_WARN, 14),
        ("•  Fleet 30 คัน ไม่พอ กับ demand 16k → ต้องตีความ Feedback #6 ใหม่: หา trade-off ไม่ใช่ลดอย่างเดียว", False, COLOR_TEXT, 12),
        ("•  GA 3 seeds ให้ score เท่ากันเป๊ะ → ติด local optimum → ต้องเพิ่ม generations 15 → 50+", False, COLOR_TEXT, 12),
    ]
    for i, (text, bold, color, size) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = 1.2
        r = p.add_run()
        r.text = text
        set_run(r, size, bold=bold, color=color)

    add_footer(s, 9)


def slide10_next(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_background(s)
    add_sidebar(s)
    add_title(s, "แผนงานถัดไป + คำถามอาจารย์",
              "Next 3 Weeks  —  Phase 5–6 และประเด็นขอคำแนะนำ")

    # Left: next steps
    add_card(s, Inches(0.8), Inches(2.1), Inches(6.1), Inches(4.6),
             "Next 3 Weeks",
             [
                 "สัปดาห์ 1  —  เพิ่ม GA/SA/PSO budget",
                 "          รัน full-scale benchmark ซ้ำ",
                 "          + Convergence curves",
                 "",
                 "สัปดาห์ 2  —  Phase 5: Fleet Trade-off",
                 "          Fleet ∈ {30, 40, 50, 60}",
                 "          พล็อต Pareto Front",
                 "",
                 "สัปดาห์ 3  —  Phase 6: Dashboard + SUMO",
                 "          Punctuality UI / Queue Timeline",
                 "          SUMO <person>/<ride> validation",
             ], header_color=COLOR_PRIMARY)

    # Right: questions
    add_card(s, Inches(7.0), Inches(2.1), Inches(5.6), Inches(4.6),
             "ขอคำแนะนำอาจารย์",
             [
                 "1.  Fleet 30 คันเป็น “เพดานงบ” จริง",
                 "    หรือเพิ่มได้ตามความจำเป็น?",
                 "",
                 "2.  น้ำหนัก Fitness สุดท้าย:",
                 "    0.3 / 0 / 0.7 (ตาม abstract)",
                 "    หรือ 0.2 / 0.15 / 0.35 (กัน overfit)?",
                 "",
                 "3.  ขอตารางเรียนครบทุกคณะ",
                 "    เพื่อ validate O-D matrix จริง",
                 "",
                 "4.  SUMO validation: เทียบ tripinfo.xml",
                 "    พอ หรือต้องรันทั้งวันเต็ม?",
             ], header_color=COLOR_WARN)

    add_footer(s, 10)


def main():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    slide1_cover(prs)
    slide2_scope(prs)
    slide3_demand(prs)
    slide4_punctuality(prs)
    slide5_fitness(prs)
    slide6_benchmark(prs)
    slide7_inputs(prs)
    slide8_extras(prs)
    slide9_results(prs)
    slide10_next(prs)

    prs.save(str(OUT_PATH))
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
