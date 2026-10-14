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

export const ROUTE_COLORS = [
  { stroke: "#2563eb", bg: "bg-blue-600", text: "text-blue-600", border: "border-blue-500", name: "Blue" },
  { stroke: "#9333ea", bg: "bg-purple-600", text: "text-purple-600", border: "border-purple-500", name: "Purple" },
  { stroke: "#059669", bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-500", name: "Emerald" },
  { stroke: "#d97706", bg: "bg-amber-600", text: "text-amber-600", border: "border-amber-500", name: "Amber" },
  { stroke: "#e11d48", bg: "bg-rose-600", text: "text-rose-600", border: "border-rose-500", name: "Rose" },
  { stroke: "#0891b2", bg: "bg-cyan-600", text: "text-cyan-600", border: "border-cyan-500", name: "Cyan" },
];
