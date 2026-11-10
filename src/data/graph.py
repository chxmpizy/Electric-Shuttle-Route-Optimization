import networkx as nx
def km_to_min(km: float, speed_kmh: float = 50.0) -> float:

    return round(km * 60 / speed_kmh, 2)
def _add_route_edges(graph: nx.DiGraph, edges: list[tuple[str, str, float]]) -> None:

    for source, target, km in edges:
        graph.add_edge(source, target, weight=km_to_min(km))

import math

# ─── แบบจำลองเวลาวิ่งรถ ─────────────────────────────────────────────────────
MAX_SPEED_KMH = 50.0     # ความเร็วสูงสุด (ไม่เกิน 50 กม./ชม.)
ACCEL_MS2 = 1.0          # อัตราเร่งออกจากป้าย (ม./วินาที²) — ค่าสบายของรถบัส
DECEL_MS2 = 1.0          # อัตราหน่วงเข้าป้าย (ม./วินาที²)

# ─── สัญญาณไฟจราจร 1 จุด (เขียว → เหลือง → แดง) ─────────────────────────────
# ตั้งอยู่บนถนน Green ↔ SC2_SC3 ที่ระยะ 50% (มีผลทั้งสองทิศ)
TRAFFIC_LIGHT = {
    "edge": ("Green", "SC2_SC3"),
    "position": 0.5,     # สัดส่วนระยะจากป้ายต้นทาง
    "green_sec": 40.0,
    "yellow_sec": 3.0,   # สมมติ: เจอไฟเหลืองแล้วหยุด (ฝั่งระมัดระวัง)
    "red_sec": 37.0,
    "offset_sec": 0.0,   # เวลาเริ่มรอบไฟเขียว นับจากเที่ยงคืน
}

GPS_COORDS = {
    "Depot": (100.61550, 14.07750),
    "Dome": (100.59560, 14.07542),
    "Hospital": (100.61500, 14.07720),
    "Dorm": (100.60000, 14.06700),
    "Gate1": (100.60750, 14.06650),
    "Library": (100.60150, 14.07130),
    "Park": (100.60200, 14.07250),
    "SC1": (100.60500, 14.07200),
    "SC2_SC3": (100.60400, 14.07000),
    "Green": (100.59800, 14.06900),
    "Convention": (100.60100, 14.06800),
    "Terminal": (100.60700, 14.06900),
    "Lecture": (100.60450, 14.07300),
    "Health": (100.61300, 14.07600),
    "Social": (100.59900, 14.07400),
}

def haversine(lon1, lat1, lon2, lat2):
    # Calculate the great circle distance between two points in km.
    R = 6371.0 # Earth radius in km
    dlon = math.radians(lon2 - lon1)
    dlat = math.radians(lat2 - lat1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_real_dist(stop1, stop2, routing_factor=1.3):

    if stop1 not in GPS_COORDS or stop2 not in GPS_COORDS:
        return 1.0
    lon1, lat1 = GPS_COORDS[stop1]
    lon2, lat2 = GPS_COORDS[stop2]
    dist_km = haversine(lon1, lat1, lon2, lat2)
    return max(0.1, dist_km * routing_factor)

def run_time_min(km: float) -> float:
    """
    เวลาวิ่งจากป้ายหนึ่งถึงป้ายถัดไป (นาที) — ออกตัวจากหยุดนิ่ง และหยุดนิ่งที่ป้ายถัดไป
    ช่วงยาวพอ: เร่ง → วิ่งคงที่ MAX_SPEED → เบรก (trapezoid)
    ช่วงสั้น: เร่งแล้วเบรกเลย ไม่ถึง MAX_SPEED (triangle)
    """
    d = km * 1000.0
    v = MAX_SPEED_KMH / 3.6
    d_acc = v * v / (2 * ACCEL_MS2)
    d_dec = v * v / (2 * DECEL_MS2)
    if d >= d_acc + d_dec:
        sec = v / ACCEL_MS2 + v / DECEL_MS2 + (d - d_acc - d_dec) / v
    else:
        v_peak = math.sqrt(2 * d * ACCEL_MS2 * DECEL_MS2 / (ACCEL_MS2 + DECEL_MS2))
        sec = v_peak / ACCEL_MS2 + v_peak / DECEL_MS2
    return sec / 60.0


def _stop_loss_sec() -> float:
    """เวลาที่เสียเพิ่มจากการหยุดที่ไฟแดงแล้วออกตัวใหม่ เทียบกับวิ่งผ่านด้วย MAX_SPEED"""
    v = MAX_SPEED_KMH / 3.6
    return v / (2 * ACCEL_MS2) + v / (2 * DECEL_MS2)


def light_delay_min(arrive_min: float, light: dict = TRAFFIC_LIGHT) -> float:
    """
    เวลาที่รถเสียที่ไฟจราจร (นาที) ถ้าถึงไฟที่เวลา arrive_min (นาทีจากเที่ยงคืน)
    เขียว → ผ่านเลย (0) / เหลืองหรือแดง → รอจนไฟเขียว + เวลาเบรกและออกตัวใหม่
    """
    cycle = light["green_sec"] + light["yellow_sec"] + light["red_sec"]
    phase = (arrive_min * 60.0 - light["offset_sec"]) % cycle
    if phase < light["green_sec"]:
        return 0.0
    return ((cycle - phase) + _stop_loss_sec()) / 60.0


def expected_light_delay_min(light: dict = TRAFFIC_LIGHT) -> float:
    """ค่าคาดหมายของเวลาที่เสียที่ไฟ ถ้ารถมาถึงเวลาสุ่ม — ใช้เป็นน้ำหนักกราฟสำหรับวางแผน"""
    cycle = light["green_sec"] + light["yellow_sec"] + light["red_sec"]
    stop_window = light["yellow_sec"] + light["red_sec"]
    mean_wait = stop_window * stop_window / (2 * cycle)
    p_stop = stop_window / cycle
    return (mean_wait + p_stop * _stop_loss_sec()) / 60.0


def has_light(source: str, target: str, light: dict = TRAFFIC_LIGHT) -> bool:
    return {source, target} == set(light["edge"])


def build_graph() -> nx.DiGraph:
 
    graph = nx.DiGraph()
    stops = [
        "Dorm", "Green", "SC2_SC3", "Health", "Lecture",
        "Convention", "Terminal", "Library", "Hospital", "Park",
        "Dome", "Gate1", "SC1", "Social",
    ]
    graph.add_nodes_from(stops)
    
    edges_list = [
        ("Dorm", "Green"), ("Green", "SC2_SC3"), ("SC2_SC3", "Health"), ("Health", "Lecture"), ("Lecture", "Dorm"),
        ("Convention", "Terminal"), ("Terminal", "SC2_SC3"), ("SC2_SC3", "Library"), ("Library", "Dorm"), ("Dorm", "Convention"),
        ("Convention", "Dorm"), ("Dorm", "Library"), ("Library", "SC2_SC3"), ("SC2_SC3", "Terminal"), ("Terminal", "Convention"),
        ("Convention", "Hospital"), ("Hospital", "Health"), ("Health", "Park"), ("Park", "Lecture"), ("Lecture", "Convention"),
        ("Dome", "Gate1"), ("Gate1", "SC1"), ("SC1", "Library"), ("Library", "Green"), ("Green", "Dorm"),
        ("Convention", "Social"), ("Social", "Lecture"), ("Lecture", "Park"), ("Park", "Health"), ("Health", "Hospital")
    ]
    
    for s, t in edges_list:
        km = get_real_dist(s, t)
        base = run_time_min(km)
        light = has_light(s, t)
        expected = base + (expected_light_delay_min() if light else 0.0)
        # weight = เวลาคาดหมาย (ใช้หา shortest path / cycle time)
        # base_min + light_pos = ใช้ใน simulation เพื่อคิดไฟแดงตามเวลาจริงที่รถไปถึง
        graph.add_edge(s, t, weight=round(expected, 2), km=round(km, 3),
                       base_min=round(base, 3), light_pos=TRAFFIC_LIGHT["position"] if light else None)
        
    return graph
def make_bidirectional(graph: nx.DiGraph) -> nx.DiGraph:
    edges = list(graph.edges(data=True))
    for source, target, data in edges:
        rev = dict(data)
        if rev.get("light_pos") is not None:
            rev["light_pos"] = 1.0 - rev["light_pos"]
        graph.add_edge(target, source, **rev)
    return graph
def calculate_cycle_time(route_path: list[str], graph: nx.DiGraph) -> float:
  
    driving_time = 0.0
    for i in range(len(route_path) - 1):
        current_stop = route_path[i]
        next_stop = route_path[i + 1]
        try:
            driving_time += graph[current_stop][next_stop]["weight"]
        except KeyError:
            try:
                driving_time += nx.shortest_path_length(
                    graph,
                    source=current_stop,
                    target=next_stop,
                    weight="weight",
                )
            except nx.NetworkXNoPath:
                driving_time += 999
                
    # Realistic time factors
    num_stops = len(route_path)
    dwell_time_per_stop = 1.5  # 1.5 minutes for parking, boarding, and alighting per stop
    layover_time = 5.0         # 5 minutes driver rest/buffer time at the end of the loop
    
    total_time = driving_time + (num_stops * dwell_time_per_stop) + layover_time
    return round(total_time, 2)