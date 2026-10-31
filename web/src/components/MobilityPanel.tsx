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

  const total = totalPassengers ?? 0;
  const stranded = strandedPassengers ?? 0;
  const late = latePassengers ?? 0;
  const onTimeCount =
    typeof onTimeRatePct === "number" && total > 0
      ? Math.round(((total - stranded - late) * onTimeRatePct) / 100)
      : Math.max(0, total - stranded - late);
  const uncountedServed = Math.max(0, total - stranded - late - onTimeCount);

  const sortedBuses = useMemo(
    () => [...busStats].sort((a, b) => b.utilization_pct - a.utilization_pct),
    [busStats]
  );
  const maxUtil = sortedBuses[0]?.utilization_pct ?? 0;

  const topOD = useMemo(() => odMatrix.slice(0, 12), [odMatrix]);
  const maxOD = topOD[0]?.count ?? 0;

  const seriesStats = useMemo(() => {
    if (!timeseries.length) return null;
    const maxWaiting = Math.max(...timeseries.map((p) => p.waiting), 1);
    const maxOnBus = Math.max(...timeseries.map((p) => p.on_bus), 1);
    const maxArrived = Math.max(...timeseries.map((p) => p.arrived), 1);
    const yMax = Math.max(maxWaiting, maxOnBus, maxArrived, 1);
    return { yMax };
  }, [timeseries]);

  if (!hasData) {
    return (
      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h3 className="text-[15px] font-semibold text-neutral-900">
          การเดินทางของผู้โดยสาร
        </h3>
        <p className="text-[13px] text-neutral-500 mt-2">
          ยังไม่มีข้อมูล — กด{" "}
          <span className="font-medium text-neutral-800">Run</span>{" "}
          เพื่อให้ API ส่งข้อมูล mobility
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Overview stats ─────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100">
          <h3 className="text-[15px] font-semibold text-neutral-900">
            ภาพรวมผู้โดยสาร
          </h3>
          <p className="text-[12px] text-neutral-500 mt-0.5">
            รวมผลตลอดการจำลองการเดินรถหนึ่งวันทำการ
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-neutral-100">
          <StatCell
            label="ผู้โดยสารรวม"
            value={total.toString()}
            hint="ทั้งหมดในระบบ"
          />
          <StatCell
            label="ถึงทันเรียน"
            value={typeof onTimeRatePct === "number" ? `${onTimeRatePct.toFixed(1)}%` : "—"}
            hint="เข้าเรียนก่อนเวลา"
            dot="emerald"
          />
          <StatCell
            label="สาย"
            value={late.toString()}
            hint="ถึงหลังเวลาเรียน"
            dot="amber"
          />
          <StatCell
            label="ตกค้าง"
            value={stranded.toString()}
            hint="ยังรอ + ค้างบนรถ"
            dot="red"
          />
          <StatCell
            label="Fleet util"
            value={typeof fleetUtilPct === "number" ? `${fleetUtilPct.toFixed(1)}%` : "—"}
            hint={`รถทั้งหมด ${totalBuses ?? "?"} คัน`}
            dot="indigo"
          />
        </div>
      </section>

      {/* ─── Passenger breakdown bar ────────────────────────── */}
      {total > 0 && (
        <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-100">
            <h3 className="text-[15px] font-semibold text-neutral-900">
              สัดส่วนผู้โดยสาร
            </h3>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              แยกตามสถานะการเดินทางเมื่อสิ้นสุดการจำลอง
            </p>
          </div>
          <div className="px-6 py-5">
            <div className="h-6 w-full rounded-lg overflow-hidden flex border border-neutral-200 bg-neutral-50">
              <SegBar count={onTimeCount} total={total} color="bg-emerald-500" />
              <SegBar count={late} total={total} color="bg-amber-500" />
              <SegBar count={uncountedServed} total={total} color="bg-neutral-400" />
              <SegBar count={stranded} total={total} color="bg-red-400" />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[12px]">
              <LegendItem swatch="bg-emerald-500" label="ทัน" count={onTimeCount} />
              <LegendItem swatch="bg-amber-500" label="สาย" count={late} />
              {uncountedServed > 0 && (
                <LegendItem
                  swatch="bg-neutral-400"
                  label="ถึง (ไม่มีคาบ)"
                  count={uncountedServed}
                />
              )}
              <LegendItem swatch="bg-red-400" label="ตกค้าง" count={stranded} />
            </div>
          </div>
        </section>
      )}

      {/* ─── Time-series ────────────────────────────────────── */}
      {timeseries.length > 0 && seriesStats && (
        <MobilityTimeSeries data={timeseries} yMax={seriesStats.yMax} />
      )}

      {/* ─── Per-bus utilization ────────────────────────────── */}
      {sortedBuses.length > 0 && (
        <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-neutral-900">
                การใช้งานรถแต่ละคัน
              </h3>
              <p className="text-[12px] text-neutral-500 mt-0.5">
                % Utilization = boarded ÷ (trips × capacity) — สูง = คุ้ม, ต่ำ = วิ่งเปล่า
              </p>
            </div>
            <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
              {sortedBuses.length} คัน
            </span>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-end gap-0.5 h-32 overflow-x-auto scrollbar-thin pb-2">
              {sortedBuses.map((b) => {
                const color =
                  b.utilization_pct > 15
                    ? "bg-emerald-500"
                    : b.utilization_pct > 5
                    ? "bg-amber-500"
                    : "bg-red-400";
                return (
                  <div
                    key={b.bus_id}
                    className="shrink-0 flex flex-col items-center justify-end group relative"
                    style={{
                      width: `max(10px, ${Math.min(28, 1000 / sortedBuses.length)}px)`,
                    }}
                  >
                    <div
                      className={`w-full rounded-t ${color} hover:opacity-80 transition`}
                      style={{
                        height: `${(b.utilization_pct / Math.max(1, maxUtil)) * 100}%`,
                        minHeight: b.utilization_pct > 0 ? "2px" : "0px",
                      }}
                    />
                    <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-neutral-900 text-white text-[11px] rounded-md px-2 py-1.5 whitespace-nowrap shadow-lg">
                      <div className="font-semibold">Bus #{b.bus_id}</div>
                      <div className="tabular-nums">
                        Util: {b.utilization_pct.toFixed(1)}%
                      </div>
                      <div className="tabular-nums">Trips: {b.trips}</div>
                      <div className="tabular-nums">
                        Boarded: {b.boarded}/{b.capacity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-5 text-[11px] text-neutral-500 mt-3">
              <LegendItem swatch="bg-emerald-500" label=">15% ใช้คุ้ม" />
              <LegendItem swatch="bg-amber-500" label="5–15% ปานกลาง" />
              <LegendItem swatch="bg-red-400" label="<5% ใช้ต่ำ" />
            </div>
          </div>
        </section>
      )}

      {/* ─── Top OD ─────────────────────────────────────────── */}
      {topOD.length > 0 && (
        <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-neutral-900">
                เส้นทางที่มีผู้โดยสารมากที่สุด
              </h3>
              <p className="text-[12px] text-neutral-500 mt-0.5">
                คู่ป้ายต้นทาง → ปลายทาง (เรียงจากมากไปน้อย)
              </p>
            </div>
            <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
              {odMatrix.length} คู่
            </span>
          </div>

          <div className="px-6 py-5 space-y-2">
            {topOD.map((od) => (
              <div
                key={`${od.from}-${od.to}`}
                className="flex items-center gap-3 text-[12px]"
              >
                <div className="w-56 flex items-center gap-1.5 shrink-0">
                  <span className="font-medium text-neutral-800 truncate">
                    {shortName(od.from)}
                  </span>
                  <span className="text-neutral-400 shrink-0">→</span>
                  <span className="font-medium text-neutral-800 truncate">
                    {shortName(od.to)}
                  </span>
                </div>
                <div className="flex-1 h-5 bg-neutral-100 rounded overflow-hidden relative">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${(od.count / Math.max(1, maxOD)) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-semibold text-neutral-800 tabular-nums">
                    {od.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────── */

function StatCell({
  label,
  value,
  hint,
  dot,
}: {
  label: string;
  value: string;
  hint: string;
  dot?: "emerald" | "amber" | "red" | "indigo";
}) {
  const dotClass = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    indigo: "bg-indigo-500",
  }[dot || "emerald"];

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </span>
      </div>
      <div className="text-[22px] font-semibold text-neutral-900 mt-1.5 tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[11px] text-neutral-500 mt-1.5">{hint}</div>
    </div>
  );
}

function SegBar({
  count,
  total,
  color,
}: {
  count: number;
  total: number;
  color: string;
}) {
  if (count <= 0) return null;
  const pct = (count / total) * 100;
  return (
    <div
      className={`${color} h-full flex items-center justify-center text-[11px] font-semibold text-white tabular-nums`}
      style={{ width: `${pct}%` }}
    >
      {pct > 6 ? count : ""}
    </div>
  );
}

function LegendItem({
  swatch,
  label,
  count,
}: {
  swatch: string;
  label: string;
  count?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-neutral-600">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${swatch}`} />
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="font-semibold text-neutral-900 tabular-nums">{count}</span>
      )}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────
   Time-series line chart
   ────────────────────────────────────────────────────────── */

function MobilityTimeSeries({
  data,
  yMax,
}: {
  data: MobilityPoint[];
  yMax: number;
}) {
  const W = 760;
  const H = 260;
  const PAD_L = 52;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 40;
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
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-neutral-900">
            การเคลื่อนไหวของผู้โดยสารตามเวลา
          </h3>
          <p className="text-[12px] text-neutral-500 mt-0.5">
            จำนวนคนที่รอป้าย, อยู่บนรถ, และถึงปลายทาง (bucket 10 นาที)
          </p>
        </div>
        <div className="flex gap-5 text-[11px]">
          <LegendItem swatch="bg-amber-500" label="รอที่ป้าย" />
          <LegendItem swatch="bg-indigo-500" label="อยู่บนรถ" />
          <LegendItem swatch="bg-emerald-500" label="ถึงแล้ว" />
        </div>
      </div>

      <div className="px-6 py-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={t.y}
                x2={W - PAD_R}
                y2={t.y}
                stroke="#e5e5e5"
                strokeDasharray="3 4"
              />
              <text
                x={PAD_L - 10}
                y={t.y + 4}
                textAnchor="end"
                fill="#737373"
                fontSize="11"
              >
                {Math.round(t.v)}
              </text>
            </g>
          ))}

          {xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={H - PAD_B + 18}
              textAnchor="middle"
              fill="#737373"
              fontSize="11"
            >
              {t.label}
            </text>
          ))}

          <text
            x={W / 2}
            y={H - 6}
            textAnchor="middle"
            fill="#525252"
            fontSize="11"
            fontWeight="500"
          >
            เวลา (HH:MM)
          </text>
          <text
            x={-H / 2}
            y={16}
            textAnchor="middle"
            transform="rotate(-90)"
            fill="#525252"
            fontSize="11"
            fontWeight="500"
          >
            จำนวนผู้โดยสาร
          </text>

          <path d={pathArrived} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={pathOnBus} fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={pathWait} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </section>
  );
}
