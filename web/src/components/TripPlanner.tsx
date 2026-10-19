"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CAMPUS_STOPS } from "@/types/shuttle";

interface TripOption {
  route_index: number;
  route_path: string[];
  origin_stop: string;
  destination_stop: string;
  headway_minutes: number;
  num_bus_on_route: number | null;
  recommended_at_stop_minutes: number;
  bus_arrives_origin_minutes: number;
  bus_arrives_destination_minutes: number;
  walk_arrival_at_building_minutes: number;
  class_start_minutes: number;
  slack_before_class_minutes: number;
  comfortable: boolean;
  trip_duration_minutes: number;
  walk_minutes: number;
  buffer_minutes: number;
}

interface PlanResponse {
  algorithm: string;
  origin_stop: string;
  destination_stop: string;
  walk_minutes: number;
  buffer_minutes: number;
  arrive_before_minutes: number;
  class_start_minutes: number;
  options: TripOption[];
  formula_note: string;
}

interface PlannerMetadata {
  stops: string[];
  building_to_stop: Record<string, string>;
  walk_time_defaults: Record<string, number>;
  default_walk_minutes: number;
  default_buffer_minutes: number;
  default_arrive_before_minutes: number;
}

const formatHHMM = (minutes: number) => {
  if (!Number.isFinite(minutes)) return "--:--";
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = Math.round(minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

const parseHHMM = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
};

const stopLabel = (id: string) => {
  const s = CAMPUS_STOPS[id];
  return s ? `${s.nameTh} (${s.nameEn})` : id;
};

export default function TripPlanner({ selectedAlgorithm }: { selectedAlgorithm: string }) {
  const [metadata, setMetadata] = useState<PlannerMetadata | null>(null);
  const [origin, setOrigin] = useState<string>("Dorm");
  const [destination, setDestination] = useState<string>("Lecture");
  const [classTime, setClassTime] = useState<string>("08:00");
  const [useOptimized, setUseOptimized] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load planner metadata (building→stop defaults — walk time จะ auto-pick ที่ backend)
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/planner-metadata")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setMetadata(data))
      .catch(() => {});
  }, []);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      // ส่งเฉพาะข้อมูลที่ user กรอก — walk/buffer/arrive_before ใช้ default จาก backend
      // (ค่าเริ่มต้นจาก paper + WALK_TIME_MIN ตามปลายทางใน src/data/timetable.py)
      const res = await fetch("http://127.0.0.1:8000/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          class_start_minutes: parseHHMM(classTime),
          algorithm: useOptimized ? selectedAlgorithm : "baseline",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "API error");
      setResult(data);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "เรียก API ไม่สำเร็จ");
      setResult(null);
    }
    setLoading(false);
  };

  const stopOptions = useMemo(
    () =>
      (metadata?.stops ?? Object.keys(CAMPUS_STOPS)).map((s) => ({
        value: s,
        label: stopLabel(s),
      })),
    [metadata]
  );

  const buildingOptions = useMemo(() => {
    // Flat list of unique building codes grouped by their stop
    const items: Array<{ code: string; stop: string }> = [];
    if (metadata?.building_to_stop) {
      Object.entries(metadata.building_to_stop).forEach(([code, stop]) =>
        items.push({ code, stop })
      );
    }
    return items;
  }, [metadata]);

  const bestOption = result?.options?.[0];
  const alternatives = result?.options?.slice(1) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          🎯 Trip Planner — เรียนที่ไหน ต้องรอรถเวลาอะไร
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          กรอกเวลาเรียนและปลายทาง ระบบจะคำนวณให้ว่า{" "}
          <b>ต้องไปรอที่ป้ายต้นทางเวลาเท่าไรเพื่อให้ไปถึงเรียนทัน</b>
        </p>
        <p className="text-[11px] text-slate-500 mt-2 italic">
          อ้างอิง Díaz-Ramírez et al. (2022) §3.2 — ระบบใช้ค่าเฉลี่ยที่สมเหตุสมผล
          (เวลาเดินจากป้าย, buffer, เผื่อก่อนเรียน) โดยอัตโนมัติ ไม่ต้องกรอกเอง
        </p>
      </div>

      {/* Form — เหลือแค่ 3 ช่องสำคัญ (ต้นทาง / ปลายทาง / เวลาเรียน) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            🏠 ต้นทาง (ป้ายที่ขึ้นรถ)
          </label>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-slate-50"
          >
            {stopOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            🏫 ปลายทาง (ตึก/ป้ายใกล้ตึก)
          </label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-slate-50"
          >
            <optgroup label="ป้ายรถ">
              {stopOptions.map((o) => (
                <option key={`stop-${o.value}`} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            {buildingOptions.length > 0 && (
              <optgroup label="รหัสตึก (map เป็นป้าย)">
                {buildingOptions.map((b) => (
                  <option key={`bld-${b.code}`} value={b.code}>
                    {b.code} → {CAMPUS_STOPS[b.stop]?.nameTh ?? b.stop}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            ⏰ เวลาเริ่มเรียน
          </label>
          <input
            type="time"
            value={classTime}
            onChange={(e) => setClassTime(e.target.value)}
            className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-slate-50 font-mono"
          />
        </div>

        <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={useOptimized}
              onChange={(e) => setUseOptimized(e.target.checked)}
              className="w-4 h-4"
            />
            ใช้ตารางที่ Optimized ล่าสุด ({selectedAlgorithm.toUpperCase()})
            — ไม่เลือก = ใช้ Baseline
          </label>
          <button
            onClick={submit}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm flex items-center gap-2 shadow-sm"
          >
            <span>{loading ? "⏳" : "🧮"}</span>
            <span>{loading ? "กำลังคำนวณ..." : "คำนวณเวลาที่ต้องไปรอ"}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Result: Best Recommendation Card */}
      {result && bestOption && (
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border-2 border-emerald-300 p-6 shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-emerald-700">
                แผนที่แนะนำ (ขึ้นรถสายที่สุดที่ยังทัน)
              </div>
              <div className="text-sm text-slate-600 mt-0.5">
                ใช้ตาราง: <b>{result.algorithm}</b> • เส้นทาง:{" "}
                {bestOption.route_path.join(" → ")}
              </div>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                bestOption.comfortable
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {bestOption.comfortable ? "✓ สบาย" : "⚠️ ตึง"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <StepCard
              icon="🏠"
              label="ไปรอที่ป้าย"
              value={formatHHMM(bestOption.recommended_at_stop_minutes)}
              hint={stopLabel(bestOption.origin_stop)}
              highlight
            />
            <StepCard
              icon="🚌"
              label="รถถึงป้าย"
              value={formatHHMM(bestOption.bus_arrives_origin_minutes)}
              hint={`ทุก ${bestOption.headway_minutes.toFixed(1)} นาที`}
            />
            <StepCard
              icon="🏁"
              label="ลงที่ป้าย"
              value={formatHHMM(bestOption.bus_arrives_destination_minutes)}
              hint={`${stopLabel(bestOption.destination_stop)} • นั่งรถ ${bestOption.trip_duration_minutes.toFixed(1)} นาที`}
            />
            <StepCard
              icon="🚶"
              label="ถึงอาคาร"
              value={formatHHMM(bestOption.walk_arrival_at_building_minutes)}
              hint={`เดิน ${bestOption.walk_minutes.toFixed(0)} นาที`}
            />
            <StepCard
              icon="🎓"
              label="เริ่มเรียน"
              value={formatHHMM(bestOption.class_start_minutes)}
              hint={`เผื่อ ${bestOption.slack_before_class_minutes.toFixed(1)} นาที`}
              highlight
            />
          </div>

          <div className="mt-5 border-t border-emerald-200 pt-4 text-sm text-slate-700">
            <b>สรุป:</b> ไปรอที่ป้าย{" "}
            <span className="font-mono bg-white px-2 py-0.5 rounded border">
              {stopLabel(bestOption.origin_stop)}
            </span>{" "}
            เวลา{" "}
            <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border">
              {formatHHMM(bestOption.recommended_at_stop_minutes)}
            </span>{" "}
            → ขึ้นรถ → ลงที่ป้าย{" "}
            <span className="font-mono bg-white px-2 py-0.5 rounded border">
              {stopLabel(bestOption.destination_stop)}
            </span>{" "}
            → เดิน {bestOption.walk_minutes.toFixed(0)} นาที → ถึงอาคาร{" "}
            <span className="font-mono bg-white px-2 py-0.5 rounded border">
              {formatHHMM(bestOption.walk_arrival_at_building_minutes)}
            </span>{" "}
            → เรียน {formatHHMM(bestOption.class_start_minutes)}
            <br />
            <span className="text-xs text-slate-500 mt-1 block">
              Deadline ต้องถึงป้ายปลายทางก่อน{" "}
              {formatHHMM(
                bestOption.class_start_minutes -
                  result.walk_minutes -
                  result.buffer_minutes -
                  result.arrive_before_minutes
              )}{" "}
              ({result.walk_minutes}+{result.buffer_minutes}+
              {result.arrive_before_minutes} นาทีก่อนเริ่มเรียน)
            </span>
          </div>
        </div>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-sm font-bold text-slate-800 mb-3">
            🔄 Alternatives (เผื่อตื่นสายหรือมีประชุมก่อน)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b">
                  <th className="text-left py-2">ไปรอที่ป้าย</th>
                  <th className="text-left py-2">รถถึง</th>
                  <th className="text-left py-2">ลงที่ป้าย</th>
                  <th className="text-left py-2">ถึงอาคาร</th>
                  <th className="text-right py-2">เผื่อก่อนเรียน</th>
                </tr>
              </thead>
              <tbody>
                {alternatives.map((o, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 font-mono font-bold text-slate-800">
                      {formatHHMM(o.recommended_at_stop_minutes)}
                    </td>
                    <td className="py-2 font-mono text-slate-700">
                      {formatHHMM(o.bus_arrives_origin_minutes)}
                    </td>
                    <td className="py-2 font-mono text-slate-700">
                      {formatHHMM(o.bus_arrives_destination_minutes)}
                    </td>
                    <td className="py-2 font-mono text-slate-700">
                      {formatHHMM(o.walk_arrival_at_building_minutes)}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          o.comfortable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {o.slack_before_class_minutes.toFixed(1)} นาที
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No options */}
      {result && result.options.length === 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-900 text-sm">
          <b>❌ ไม่มีรถเที่ยวใดทัน</b> — ลองย้ายเวลาเรียนให้ช้าลง หรือเพิ่มจำนวนรถในเส้นทางนี้
          <br />
          <span className="text-xs text-rose-700 mt-1 block">
            เส้นทางที่พบไม่มีเที่ยวที่ขึ้นต้นทาง {stopLabel(result.origin_stop)} และ
            ลงที่ {stopLabel(result.destination_stop)} ก่อน Deadline
          </span>
        </div>
      )}
    </div>
  );
}

function StepCard({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        highlight
          ? "bg-white border-emerald-400 shadow-sm"
          : "bg-white/70 border-slate-200"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div
        className={`text-xl font-bold font-mono mt-1 ${
          highlight ? "text-emerald-700" : "text-slate-800"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={hint}>
        {hint}
      </div>
    </div>
  );
}
