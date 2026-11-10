"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CAMPUS_STOPS, TravelModel } from "@/types/shuttle";

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
  travel_model?: TravelModel;
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

const stopShort = (id: string) => CAMPUS_STOPS[id]?.nameTh ?? id;

export default function TripPlanner({
  selectedAlgorithm,
}: {
  selectedAlgorithm: string;
}) {
  const [metadata, setMetadata] = useState<PlannerMetadata | null>(null);
  const [origin, setOrigin] = useState<string>("Dorm");
  const [destination, setDestination] = useState<string>("Lecture");
  const [classTime, setClassTime] = useState<string>("08:00");
  const [useOptimized, setUseOptimized] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const mode = selectedAlgorithm.toUpperCase();

  return (
    <div className="space-y-5">
      {/* ─── Intro ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h3 className="text-[15px] font-semibold text-neutral-900">
          วางแผนไปเรียนให้ทัน
        </h3>
        <p className="text-[13px] text-neutral-600 mt-1">
          กรอกเวลาเรียนและปลายทาง ระบบจะคำนวณว่า{" "}
          <span className="font-medium text-neutral-900">
            ต้องไปรอที่ป้ายต้นทางกี่โมงถึงจะทัน
          </span>
        </p>
        <p className="text-[11px] text-neutral-500 mt-2">
          อ้างอิง Díaz-Ramírez et al. (2022) §3.2 — ระบบใช้ค่า default ของเวลาเดิน,
          buffer, และ arrive-before ให้โดยอัตโนมัติ
        </p>
        {metadata?.travel_model && (
          <p className="text-[11px] text-neutral-500 mt-1">
            เวลาวิ่งรถ: เร่งออกจากป้าย → วิ่งไม่เกิน{" "}
            {metadata.travel_model.max_speed_kmh} กม./ชม. → เบรกเข้าป้าย · มีสัญญาณไฟจราจร
            1 จุดระหว่าง {stopShort(metadata.travel_model.traffic_light.edge[0])} –{" "}
            {stopShort(metadata.travel_model.traffic_light.edge[1])} (เขียว{" "}
            {metadata.travel_model.traffic_light.green_sec} / เหลือง{" "}
            {metadata.travel_model.traffic_light.yellow_sec} / แดง{" "}
            {metadata.travel_model.traffic_light.red_sec} วินาที) — เวลาที่แสดงเป็นค่าเฉลี่ย
            เผื่อติดไฟแดงไว้ใน buffer
          </p>
        )}
      </section>

      {/* ─── Form ──────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <FormField label="ต้นทาง" sub="ป้ายที่ขึ้นรถ">
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg text-neutral-800 hover:border-neutral-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            >
              {stopOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="ปลายทาง" sub="ตึก หรือ ป้ายใกล้ตึก">
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg text-neutral-800 hover:border-neutral-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            >
              <optgroup label="ป้ายรถ">
                {stopOptions.map((o) => (
                  <option key={`stop-${o.value}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
              {buildingOptions.length > 0 && (
                <optgroup label="รหัสตึก">
                  {buildingOptions.map((b) => (
                    <option key={`bld-${b.code}`} value={b.code}>
                      {b.code} → {CAMPUS_STOPS[b.stop]?.nameTh ?? b.stop}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </FormField>

          <FormField label="เวลาเริ่มเรียน" sub="นาฬิกา 24 ชม.">
            <input
              type="time"
              value={classTime}
              onChange={(e) => setClassTime(e.target.value)}
              className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg text-neutral-800 hover:border-neutral-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-mono tabular-nums transition"
            />
          </FormField>
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-[12px] text-neutral-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useOptimized}
              onChange={(e) => setUseOptimized(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            ใช้ตารางที่ Optimized ล่าสุด ({mode})
            <span className="text-neutral-400">— ไม่เลือก = ใช้ Baseline</span>
          </label>

          <button
            onClick={submit}
            disabled={loading}
            className="h-10 px-5 inline-flex items-center gap-2 bg-neutral-900 text-white rounded-lg text-[13px] font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "กำลังคำนวณ…" : "คำนวณเวลาที่ต้องไปรอ"}
          </button>
        </div>
      </section>

      {/* ─── Error ─────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-800">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          <div>
            <div className="font-semibold text-neutral-900">
              เรียก API ไม่สำเร็จ
            </div>
            <div className="text-neutral-600 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* ─── Best option result ───────────────────────────── */}
      {result && bestOption && (
        <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                แผนที่แนะนำ
              </div>
              <h4 className="text-[15px] font-semibold text-neutral-900 mt-1">
                ไปรอที่ป้ายเวลา{" "}
                <span className="text-indigo-600 tabular-nums">
                  {formatHHMM(bestOption.recommended_at_stop_minutes)}
                </span>
              </h4>
              <p className="text-[12px] text-neutral-500 mt-1">
                ใช้ตาราง{" "}
                <span className="font-medium text-neutral-700">
                  {result.algorithm}
                </span>{" "}
                · เส้นทาง {bestOption.route_path.join(" → ")}
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-medium ${
                bestOption.comfortable
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  bestOption.comfortable ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {bestOption.comfortable ? "สบาย" : "ตึง"}
            </span>
          </div>

          {/* Timeline */}
          <div className="px-6 py-5">
            <ol className="relative">
              <TimelineRow
                step={1}
                label="ไปรอที่ป้าย"
                time={formatHHMM(bestOption.recommended_at_stop_minutes)}
                hint={stopShort(bestOption.origin_stop)}
                strong
              />
              <TimelineRow
                step={2}
                label="รถถึงป้ายต้นทาง"
                time={formatHHMM(bestOption.bus_arrives_origin_minutes)}
                hint={`ปล่อยทุก ${bestOption.headway_minutes.toFixed(1)} นาที`}
              />
              <TimelineRow
                step={3}
                label="ลงที่ป้ายปลายทาง"
                time={formatHHMM(bestOption.bus_arrives_destination_minutes)}
                hint={`${stopShort(
                  bestOption.destination_stop
                )} · นั่งรถ ${bestOption.trip_duration_minutes.toFixed(1)} นาที`}
              />
              <TimelineRow
                step={4}
                label="ถึงอาคาร"
                time={formatHHMM(bestOption.walk_arrival_at_building_minutes)}
                hint={`เดิน ${bestOption.walk_minutes.toFixed(0)} นาที`}
              />
              <TimelineRow
                step={5}
                label="เริ่มเรียน"
                time={formatHHMM(bestOption.class_start_minutes)}
                hint={`เผื่อก่อนเรียน ${bestOption.slack_before_class_minutes.toFixed(
                  1
                )} นาที`}
                strong
                last
              />
            </ol>
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/60 text-[12px] text-neutral-600 leading-relaxed">
            <span className="font-medium text-neutral-800">หมายเหตุ:</span>{" "}
            ต้องถึงป้ายปลายทางก่อน{" "}
            <span className="font-mono font-semibold text-neutral-900 tabular-nums">
              {formatHHMM(
                bestOption.class_start_minutes -
                  result.walk_minutes -
                  result.buffer_minutes
              )}
            </span>{" "}
            (หักเวลาเดิน {result.walk_minutes} + buffer {result.buffer_minutes} นาที) ·
            &quot;สบาย&quot; = ถึงตึกก่อนเรียนอย่างน้อย{" "}
            {result.buffer_minutes + result.arrive_before_minutes} นาที
          </div>
        </section>
      )}

      {/* ─── Alternatives ─────────────────────────────────── */}
      {alternatives.length > 0 && (
        <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-100">
            <h4 className="text-[15px] font-semibold text-neutral-900">
              ทางเลือกอื่น
            </h4>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              เผื่อตื่นสายหรือมีประชุมก่อน
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-neutral-500 bg-neutral-50/60">
                  <th className="text-left px-6 py-3 font-medium">ไปรอที่ป้าย</th>
                  <th className="text-left px-6 py-3 font-medium">รถถึง</th>
                  <th className="text-left px-6 py-3 font-medium">ลงที่ป้าย</th>
                  <th className="text-left px-6 py-3 font-medium">ถึงอาคาร</th>
                  <th className="text-right px-6 py-3 font-medium">เผื่อก่อนเรียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {alternatives.map((o, i) => (
                  <tr key={i} className="hover:bg-neutral-50/60 transition">
                    <td className="px-6 py-3 font-mono font-semibold text-neutral-900 tabular-nums">
                      {formatHHMM(o.recommended_at_stop_minutes)}
                    </td>
                    <td className="px-6 py-3 font-mono text-neutral-700 tabular-nums">
                      {formatHHMM(o.bus_arrives_origin_minutes)}
                    </td>
                    <td className="px-6 py-3 font-mono text-neutral-700 tabular-nums">
                      {formatHHMM(o.bus_arrives_destination_minutes)}
                    </td>
                    <td className="px-6 py-3 font-mono text-neutral-700 tabular-nums">
                      {formatHHMM(o.walk_arrival_at_building_minutes)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            o.comfortable ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        <span
                          className={
                            o.comfortable ? "text-emerald-700" : "text-amber-700"
                          }
                        >
                          {o.slack_before_class_minutes.toFixed(1)} น.
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── No options ────────────────────────────────────── */}
      {result && result.options.length === 0 && (
        <section className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <div>
              <div className="text-[14px] font-semibold text-neutral-900">
                ไม่มีรถเที่ยวใดทันในเวลาที่กำหนด
              </div>
              <div className="text-[12px] text-neutral-600 mt-1">
                ลองย้ายเวลาเรียนให้ช้าลง หรือเพิ่มจำนวนรถในเส้นทางนี้ —
                ยังไม่มีรถที่ขึ้นจาก{" "}
                <span className="font-medium text-neutral-800">
                  {stopShort(result.origin_stop)}
                </span>{" "}
                ไปลงที่{" "}
                <span className="font-medium text-neutral-800">
                  {stopShort(result.destination_stop)}
                </span>{" "}
                ทันเวลา
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────── */

function FormField({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[12px] font-medium text-neutral-800">{label}</span>
        <span className="text-[11px] text-neutral-400">{sub}</span>
      </div>
      {children}
    </div>
  );
}

function TimelineRow({
  step,
  label,
  time,
  hint,
  strong,
  last,
}: {
  step: number;
  label: string;
  time: string;
  hint: string;
  strong?: boolean;
  last?: boolean;
}) {
  return (
    <li className="relative pl-10 pb-5 last:pb-0">
      {/* Vertical line */}
      {!last && (
        <span className="absolute left-[11px] top-6 bottom-0 w-px bg-neutral-200" />
      )}

      {/* Node */}
      <span
        className={`absolute left-0 top-1 w-6 h-6 inline-flex items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
          strong
            ? "bg-neutral-900 text-white"
            : "bg-neutral-100 text-neutral-700"
        }`}
      >
        {step}
      </span>

      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`text-[13px] ${
              strong
                ? "font-semibold text-neutral-900"
                : "font-medium text-neutral-800"
            }`}
          >
            {label}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">{hint}</div>
        </div>
        <div
          className={`font-mono tabular-nums shrink-0 ${
            strong
              ? "text-[18px] font-semibold text-neutral-900"
              : "text-[14px] font-medium text-neutral-700"
          }`}
        >
          {time}
        </div>
      </div>
    </li>
  );
}
