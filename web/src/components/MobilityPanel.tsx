"use client";

import React, { useMemo } from "react";
import { BusStat, ODEntry, MobilityPoint, CAMPUS_STOPS } from "@/types/shuttle";

interface MobilityPanelProps {
  busStats: BusStat[];
  onTimeRatePct?: number | null;
  latePassengers?: number | null;
  strandedPassengers?: number | null;
  totalPassengers?: number | null;
  totalBuses?: number | null;
  fleetUtilPct?: number | null;
  odMatrix?: ODEntry[];
  timeseries?: MobilityPoint[];
}

const formatMinute = (m: number) => {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
};

const shortName = (id: string) => CAMPUS_STOPS[id]?.nameTh ?? id;

export default function MobilityPanel({
  busStats,
  onTimeRatePct,
  latePassengers,
  strandedPassengers,
  totalPassengers,
  totalBuses,
  fleetUtilPct,
  odMatrix = [],
  timeseries = [],
}: MobilityPanelProps) {
  const hasData = busStats.length > 0 || timeseries.length > 0;

  // ─── Passenger status breakdown ─────────────────────────────────────────
  const total = totalPassengers ?? 0;
  const stranded = strandedPassengers ?? 0;
  const late = latePassengers ?? 0;
  const onTimeCount =
    typeof onTimeRatePct === "number" && total > 0
      ? Math.round(((total - stranded - late) * onTimeRatePct) / 100)
      : Math.max(0, total - stranded - late);
  const uncountedServed = Math.max(0, total - stranded - late - onTimeCount);

  // ─── Bus utilization histogram ──────────────────────────────────────────
  const sortedBuses = useMemo(
    () => [...busStats].sort((a, b) => b.utilization_pct - a.utilization_pct),
    [busStats]
  );
  const maxUtil = sortedBuses[0]?.utilization_pct ?? 0;

  // ─── Top O-D flows ──────────────────────────────────────────────────────
  const topOD = useMemo(() => odMatrix.slice(0, 12), [odMatrix]);
  const maxOD = topOD[0]?.count ?? 0;

  // ─── Time-series chart ──────────────────────────────────────────────────
  const seriesStats = useMemo(() => {
    if (!timeseries.length) return null;
    const maxWaiting = Math.max(...timeseries.map((p) => p.waiting), 1);
    const maxOnBus = Math.max(...timeseries.map((p) => p.on_bus), 1);
    const maxArrived = Math.max(...timeseries.map((p) => p.arrived), 1);
    const yMax = Math.max(maxWaiting, maxOnBus, maxArrived, 1);
    return { yMax, maxWaiting, maxOnBus, maxArrived };
  }, [timeseries]);

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          🚶 Mobility Panel (การเดินทางของผู้โดยสาร)
        </h3>
        <p className="text-sm text-slate-500">
          ยังไม่มีข้อมูลการเดินทาง — กดปุ่ม <span className="font-semibold">Run Live Simulation</span>{" "}
          เพื่อให้ API ส่ง bus_stats, od_matrix และ mobility_timeseries กลับ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Overview Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="ผู้โดยสารรวม"
          value={total.toString()}
          hint="จำนวนผู้โดยสารทั้งหมดในช่วงจำลอง"
          tone="slate"
        />
        <StatCard
          label="ถึงทันเรียน"
          value={typeof onTimeRatePct === "number" ? `${onTimeRatePct.toFixed(1)}%` : "—"}
          hint="เข้าเรียนก่อนเวลาที่กำหนด"
          tone="emerald"
        />
        <StatCard
          label="สาย"
          value={late.toString()}
          hint="ถึงปลายทางหลังเวลาเรียน"
          tone="amber"
        />
        <StatCard
          label="ตกค้าง"
          value={stranded.toString()}
          hint="ยังรอ + ค้างบนรถ"
          tone="rose"
        />
        <StatCard
          label="Fleet util"
          value={typeof fleetUtilPct === "number" ? `${fleetUtilPct.toFixed(1)}%` : "—"}
          hint={`รถทั้งหมด ${totalBuses ?? "?"} คัน`}
          tone="blue"
        />
      </div>

      {/* ─── Passenger status breakdown bar ─────────────────────────── */}
      {total > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h4 className="text-sm font-bold text-slate-700 mb-3">
            📊 สัดส่วนผู้โดยสาร (Breakdown)
          </h4>
          <div className="h-6 w-full rounded-lg overflow-hidden flex border border-slate-200">
            <SegBar count={onTimeCount} total={total} color="bg-emerald-500" label="ทัน" />
            <SegBar count={late} total={total} color="bg-amber-500" label="สาย" />
            <SegBar count={uncountedServed} total={total} color="bg-sky-400" label="ถึง (ไม่มีเวลาเรียน)" />
            <SegBar count={stranded} total={total} color="bg-rose-500" label="ตกค้าง" />
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
            <LegendDot color="bg-emerald-500" label={`ทัน ${onTimeCount}`} />
            <LegendDot color="bg-amber-500" label={`สาย ${late}`} />
            {uncountedServed > 0 && (
              <LegendDot color="bg-sky-400" label={`ถึงปลายทาง (ไม่มีคลาส) ${uncountedServed}`} />
            )}
            <LegendDot color="bg-rose-500" label={`ตกค้าง ${stranded}`} />
          </div>
        </div>
      )}

      {/* ─── Mobility time-series ───────────────────────────────────── */}
      {timeseries.length > 0 && seriesStats && (
        <MobilityTimeSeries data={timeseries} yMax={seriesStats.yMax} />
      )}

      {/* ─── Per-bus utilization histogram ─────────────────────────── */}
      {sortedBuses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                🚌 Per-bus Utilization (Monitor รถแต่ละคัน)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                แกน Y: Utilization % = boarded / (trips × capacity) — สูง = ใช้คุ้ม, ต่ำ = วิ่งเปล่า
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {sortedBuses.length} คัน
            </span>
          </div>
          <div className="flex items-end gap-0.5 h-32 overflow-x-auto pb-2">
            {sortedBuses.map((b) => (
              <div
                key={b.bus_id}
                className="flex-shrink-0 flex flex-col items-center justify-end group relative"
                style={{ width: `max(10px, ${Math.min(28, 1000 / sortedBuses.length)}px)` }}
              >
                <div
                  className={`w-full rounded-t ${
                    b.utilization_pct > 15
                      ? "bg-emerald-500"
                      : b.utilization_pct > 5
                      ? "bg-amber-500"
                      : "bg-rose-400"
                  } hover:opacity-80 transition`}
                  style={{
                    height: `${(b.utilization_pct / Math.max(1, maxUtil)) * 100}%`,
                    minHeight: b.utilization_pct > 0 ? "2px" : "0px",
                  }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  <div className="font-bold">Bus #{b.bus_id}</div>
                  <div>Util: {b.utilization_pct.toFixed(1)}%</div>
                  <div>Trips: {b.trips}</div>
                  <div>Boarded: {b.boarded}</div>
                  <div>Capacity: {b.capacity}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-slate-600 mt-2">
            <LegendDot color="bg-emerald-500" label=">15% (ใช้คุ้ม)" />
            <LegendDot color="bg-amber-500" label="5–15% (ปานกลาง)" />
            <LegendDot color="bg-rose-400" label="<5% (ใช้ต่ำ)" />
          </div>
        </div>
      )}

      {/* ─── Top O-D Flows ─────────────────────────────────────────── */}
      {topOD.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                🗺️ Top Origin-Destination Flows (ต้นทาง → ปลายทาง)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                จำนวนผู้โดยสารแยกตามคู่ป้ายต้นทาง-ปลายทาง (เรียงจากมากไปน้อย)
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {odMatrix.length} คู่ป้าย
            </span>
          </div>
          <div className="space-y-1.5">
            {topOD.map((od) => (
              <div
                key={`${od.from}-${od.to}`}
                className="flex items-center gap-3 text-sm"
              >
                <div className="w-56 flex items-center gap-1 text-slate-700 truncate">
                  <span className="font-medium">{shortName(od.from)}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-medium">{shortName(od.to)}</span>
                </div>
                <div className="flex-1 bg-slate-100 rounded h-5 overflow-hidden relative">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${(od.count / Math.max(1, maxOD)) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-bold text-slate-800">
                    {od.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "slate" | "emerald" | "amber" | "rose" | "blue";
}) {
  const toneClass = {
    slate: "bg-slate-50 border-slate-200 text-slate-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      <div className="text-[11px] opacity-70 mt-0.5">{hint}</div>
    </div>
  );
}

function SegBar({ count, total, color }: { count: number; total: number; color: string; label: string }) {
  if (count <= 0) return null;
  const pct = (count / total) * 100;
  return (
    <div
      className={`${color} h-full flex items-center justify-center text-[11px] font-bold text-white`}
      style={{ width: `${pct}%` }}
    >
      {pct > 6 ? count : ""}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded ${color}`} />
      <span>{label}</span>
    </span>
  );
}

function MobilityTimeSeries({ data, yMax }: { data: MobilityPoint[]; yMax: number }) {
  const W = 720;
  const H = 240;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 32;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;
  const toX = (i: number) => PAD_L + i * xStep;
  const toY = (v: number) => PAD_T + innerH - (v / yMax) * innerH;

  const build = (key: keyof MobilityPoint) =>
    data
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(2)} ${toY(p[key] as number).toFixed(2)}`)
      .join(" ");

  const pathWait = build("waiting");
  const pathOnBus = build("on_bus");
  const pathArrived = build("arrived");

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = (yMax * i) / yTicks;
    return { v, y: toY(v) };
  });

  const xTickCount = Math.min(8, data.length);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const idx = Math.round((i / (xTickCount - 1 || 1)) * (data.length - 1));
    return { idx, x: toX(idx), label: formatMinute(data[idx]?.t ?? 0) };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-start justify-between border-b pb-3 mb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800">
            📈 Passenger Flow Over Time (คน รอ / บนรถ / ถึงปลายทาง)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            จำนวนผู้โดยสารตามเวลาจำลอง (bucket 10 นาที) — ช่วยดูว่าป้ายติดคอขวดช่วงไหน
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <LegendDot color="bg-amber-500" label="รอที่ป้าย" />
          <LegendDot color="bg-blue-500" label="บนรถ" />
          <LegendDot color="bg-emerald-500" label="ถึงแล้ว (สะสม)" />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Gridlines + Y-labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              y1={t.y}
              x2={W - PAD_R}
              y2={t.y}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
            <text
              x={PAD_L - 8}
              y={t.y + 4}
              textAnchor="end"
              className="fill-slate-500"
              fontSize="10"
            >
              {Math.round(t.v)}
            </text>
          </g>
        ))}

        {/* X labels (HH:MM) */}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={H - PAD_B + 16}
            textAnchor="middle"
            className="fill-slate-500"
            fontSize="10"
          >
            {t.label}
          </text>
        ))}

        <text
          x={W / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-slate-600 font-semibold"
          fontSize="11"
        >
          เวลา (HH:MM)
        </text>
        <text
          x={-H / 2}
          y={14}
          textAnchor="middle"
          transform="rotate(-90)"
          className="fill-slate-600 font-semibold"
          fontSize="11"
        >
          จำนวนผู้โดยสาร
        </text>

        {/* Lines */}
        <path d={pathArrived} fill="none" stroke="#10b981" strokeWidth="2" />
        <path d={pathOnBus} fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d={pathWait} fill="none" stroke="#f59e0b" strokeWidth="2" />
      </svg>
    </div>
  );
}
