export interface TimetableEntry {
  stop: string;
  arrival_time: number;
}

export interface RouteSchedule {
  route_id?: number;
  path: string[];
  num_bus: number;
  cycle_time: number;
  headway: number;
  startTime: number;
  endTime: number;
  timetable?: TimetableEntry[];
}

export interface BusStat {
  bus_id: number;
  route: string[];
  capacity: number;
  trips: number;
  boarded: number;
  alighted: number;
  ended_with_pax: number;
  utilization_pct: number;
}

export interface ODEntry {
  from: string;
  to: string;
  count: number;
}

export interface MobilityPoint {
  t: number;        // simulation minute
  waiting: number;  // reached stop, not yet on bus
  on_bus: number;   // on bus, not yet arrived
  arrived: number;  // cumulative passengers who've arrived at destination
}

export interface SimulationResult {
  baseline_wait: number;
  baseline_travel: number;
  baseline_served?: number;
  baseline_waiting?: number;
  baseline_schedule?: RouteSchedule[];
  optimized_wait: number;
  optimized_travel: number;
  optimized_served?: number;
  optimized_waiting?: number;
  schedule: RouteSchedule[];
  // Feedback #7: convergence + timing from API
  history?: number[];
  elapsed_sec?: number;
  algorithm?: string;
  // Feedback #1,#6: on-time + utilization
  on_time_rate_pct?: number | null;
  late_passengers?: number | null;
  stranded_passengers?: number | null;
  total_passengers?: number | null;
  total_buses?: number | null;
  fleet_utilization_pct?: number | null;
  bus_stats?: BusStat[];
  od_matrix?: ODEntry[];
  mobility_timeseries?: MobilityPoint[];
  data_source?: "live" | "demo";
  // Goal function 3 กรณี: ทันเรียน / มาไม่ทันป้าย / มาทันแต่รถเต็ม
  case_on_time?: number | null;
  case_missed?: number | null;
  case_bus_full?: number | null;
  baseline_case_on_time?: number | null;
  baseline_case_missed?: number | null;
  baseline_case_bus_full?: number | null;
  fitness_breakdown?: FitnessBreakdown;
}

export interface FitnessBreakdown {
  missed_component: number;
  bus_full_component: number;
  wait_component: number;
  travel_component: number;
  delay_component: number;
  fleet_component: number;
  total_cost: number;
  case_on_time_pct: number;
  case_missed_pct: number;
  case_bus_full_pct: number;
  on_time_rate_pct: number;
}

export interface TrafficLight {
  edge: [string, string];
  position: number;
  green_sec: number;
  yellow_sec: number;
  red_sec: number;
  offset_sec: number;
  lon: number;
  lat: number;
}

export interface TravelModel {
  max_speed_kmh: number;
  accel_ms2: number;
  decel_ms2: number;
  traffic_light: TrafficLight;
}

export interface BenchmarkAlgorithmData {
  algorithm: string;
  wait_time: number;
  travel_time: number;
  total_time: number;
  served: number;
  waiting: number;
  num_routes: number;
  total_buses: number;
  avg_headway: number;
  schedule?: RouteSchedule[];
  case_on_time?: number | null;
  case_missed?: number | null;
  case_bus_full?: number | null;
  fitness?: number | null;
}

export interface CampusStop {
  id: string;
  nameEn: string;
  nameTh: string;
  lon: number;
  lat: number;
  weight: number;
  desc: string;
  category: "dorm" | "academic" | "hospital" | "transit" | "recreation";
}

export const CAMPUS_STOPS: Record<string, CampusStop> = {
  Dome: {
    id: "Dome",
    nameEn: "TU Dome",
    nameTh: "TU DOME",
    lon: 100.5956,
    lat: 14.07542,
    weight: 81,
    desc: "หอพัก TU Dome และพลาซ่าฝั่งตรงข้าม",
    category: "dorm",
  },
  Hospital: {
    id: "Hospital",
    nameEn: "Thammasat Hospital",
    nameTh: "รพ.ธรรมศาสตร์",
    lon: 100.615,
    lat: 14.0772,
    weight: 200,
    desc: "โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ",
    category: "hospital",
  },
  Dorm: {
    id: "Dorm",
    nameEn: "Asian Games Dorm",
    nameTh: "หอพักเอเชียนเกมส์",
    lon: 100.6,
    lat: 14.067,
    weight: 2500,
    desc: "โซนหอพักนักศึกษา (จุดที่มีความต้องการเดินทางสูงสุด)",
    category: "dorm",
  },
  Gate1: {
    id: "Gate1",
    nameEn: "Chiang Rak Gate 1",
    nameTh: "ประตูเชียงราก 1",
    lon: 100.6075,
    lat: 14.0665,
    weight: 80,
    desc: "ทางเข้าออกหลักฝั่งเชียงราก และจุดรับ-ส่งนักศึกษา",
    category: "transit",
  },
  Library: {
    id: "Library",
    nameEn: "Puey Ungphakorn Library",
    nameTh: "หอสมุดป๋วย",
    lon: 100.6015,
    lat: 14.0713,
    weight: 846,
    desc: "หอสมุดป๋วย อึ๊งภากรณ์ ศูนย์กลางการเรียนรู้",
    category: "academic",
  },
  Park: {
    id: "Park",
    nameEn: "Puey 100-Year Park",
    nameTh: "อุทยานเรียนรู้ 100 ปี",
    lon: 100.602,
    lat: 14.0725,
    weight: 200,
    desc: "อุทยานการเรียนรู้ป๋วย 100 ปี และหลังคาสีเขียว",
    category: "recreation",
  },
  SC1: {
    id: "SC1",
    nameEn: "Science Complex 1",
    nameTh: "อาคาร SC1",
    lon: 100.605,
    lat: 14.072,
    weight: 600,
    desc: "กลุ่มอาคารคณะวิทยาศาสตร์และเทคโนโลยี 1",
    category: "academic",
  },
  SC2_SC3: {
    id: "SC2_SC3",
    nameEn: "Science Complex 2-3",
    nameTh: "อาคาร SC2 - SC3",
    lon: 100.604,
    lat: 14.07,
    weight: 600,
    desc: "กลุ่มอาคารคณะวิทยาศาสตร์และเทคโนโลยี 2-3",
    category: "academic",
  },
  Green: {
    id: "Green",
    nameEn: "Green Canteen",
    nameTh: "โรงอาหาร Green",
    lon: 100.598,
    lat: 14.069,
    weight: 100,
    desc: "โรงอาหาร Green Canteen ใกล้ศูนย์กีฬา",
    category: "recreation",
  },
  Convention: {
    id: "Convention",
    nameEn: "Convention Center",
    nameTh: "ศูนย์ประชุมธรรมศาสตร์",
    lon: 100.601,
    lat: 14.068,
    weight: 150,
    desc: "ศูนย์การประชุมธรรมศาสตร์และยิมเนเซียม",
    category: "transit",
  },
  Terminal: {
    id: "Terminal",
    nameEn: "Bus Terminal",
    nameTh: "สถานีขนส่ง",
    lon: 100.607,
    lat: 14.069,
    weight: 212,
    desc: "สถานีขนส่งรถตู้และรถโดยสารสาธารณะ",
    category: "transit",
  },
  Lecture: {
    id: "Lecture",
    nameEn: "Lecture Center (BR)",
    nameTh: "อาคารบรรยายรวม (บร.)",
    lon: 100.6045,
    lat: 14.073,
    weight: 1100,
    desc: "อาคารเรียนรวม บร.1 - บร.5 (จุดหนาแน่นช่วงเปลี่ยนคาบ)",
    category: "academic",
  },
  Health: {
    id: "Health",
    nameEn: "Health Sciences Complex",
    nameTh: "อาคารสุขศาสตร์",
    lon: 100.613,
    lat: 14.076,
    weight: 1023,
    desc: "กลุ่มอาคารสุขศาสตร์ (แพทย์ พยาบาล ทันตะ สหเวช)",
    category: "academic",
  },
  Social: {
    id: "Social",
    nameEn: "Social Sciences Complex",
    nameTh: "อาคารเรียนรวมสังคมศาสตร์",
    lon: 100.599,
    lat: 14.074,
    weight: 1500,
    desc: "กลุ่มอาคารสังคมศาสตร์และโรงอาหาร SC Canteen",
    category: "academic",
  },
};

// ตำแหน่งสัญญาณไฟจราจร — ให้ตรงกับ TRAFFIC_LIGHT ใน src/data/graph.py
export const TRAFFIC_LIGHT_EDGE: [string, string] = ["Green", "SC2_SC3"];
export const TRAFFIC_LIGHT_POSITION = 0.5;

export const ROUTE_COLORS = [
  { stroke: "#2563eb", bg: "bg-blue-600", text: "text-blue-600", border: "border-blue-500", name: "Blue" },
  { stroke: "#9333ea", bg: "bg-purple-600", text: "text-purple-600", border: "border-purple-500", name: "Purple" },
  { stroke: "#059669", bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-500", name: "Emerald" },
  { stroke: "#d97706", bg: "bg-amber-600", text: "text-amber-600", border: "border-amber-500", name: "Amber" },
  { stroke: "#e11d48", bg: "bg-rose-600", text: "text-rose-600", border: "border-rose-500", name: "Rose" },
  { stroke: "#0891b2", bg: "bg-cyan-600", text: "text-cyan-600", border: "border-cyan-500", name: "Cyan" },
];
