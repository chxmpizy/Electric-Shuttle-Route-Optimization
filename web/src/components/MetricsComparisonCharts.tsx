"use client";

import React from "react";
import { SimulationResult } from "@/types/shuttle";

interface MetricsComparisonChartsProps {
  results: SimulationResult;
  selectedMode: string;
}

export default function MetricsComparisonCharts({
  results,
  selectedMode,
}: MetricsComparisonChartsProps) {
  const bWait = results.baseline_wait;
  const oWait = results.optimized_wait;
  const bTravel = results.baseline_travel;
  const oTravel = results.optimized_travel;
  const bTotal = bWait + bTravel;
  const oTotal = oWait + oTravel;

  const bServed = results.baseline_served ?? 209;
  const oServed = results.optimized_served ?? 183;
  const bWaiting = results.baseline_waiting ?? 151;
  const oWaiting = results.optimized_waiting ?? 171;

  const waitPct = pctChange(bWait, oWait);
  const totalPct = pctChange(bTotal, oTotal);

  const bServedPct = (bServed / (bServed + bWaiting)) * 100;
  const oServedPct = (oServed / (oServed + oWaiting)) * 100;
  const servedDelta = oServedPct - bServedPct;

  const mode = selectedMode.toUpperCase();

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-neutral-100">
        <h3 className="text-[15px] font-semibold text-neutral-900">
          ประสิทธิภาพ Baseline เทียบกับ {mode}
        </h3>
        <p className="text-[12px] text-neutral-500 mt-0.5">
          ตัวเลขรวมจากการจำลองการเดินรถตลอดช่วงเวลาให้บริการ
        </p>
      </div>

      {/* ─── Impact headline ──────────────────────────────── */}
      <div className="px-6 py-5 bg-neutral-50/60 border-b border-neutral-100">
        <HeadlineImpact
          waitPct={waitPct}
          waitDiffAbs={Math.abs(oWait - bWait)}
          totalPct={totalPct}
          totalDiffAbs={Math.abs(oTotal - bTotal)}
          mode={mode}
        />
      </div>

      {/* ─── Metric comparison bars ───────────────────────── */}
      <div className="px-6 py-5 border-b border-neutral-100 space-y-5">
        <SectionLabel>เปรียบเทียบตามเวลาเฉลี่ย (นาที)</SectionLabel>

        <MetricRow
          label="เวลารอรถ"
          sub="Average wait time"
          baseline={bWait}
          optimized={oWait}
          mode={mode}
        />
        <MetricRow
          label="เวลาเดินทางบนรถ"
          sub="Average travel time"
          baseline={bTravel}
          optimized={oTravel}
          mode={mode}
        />
        <MetricRow
          label="เวลาเดินทางรวม"
          sub="Total journey time"
          baseline={bTotal}
          optimized={oTotal}
          mode={mode}
          strong
        />
      </div>

      {/* ─── Throughput ──────────────────────────────────── */}
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <SectionLabel>สัดส่วนผู้โดยสารที่ให้บริการสำเร็จ</SectionLabel>
          <DeltaChip
            value={servedDelta}
            formatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
            invert={false}
          />
        </div>

        <ThroughputRow
          label="Baseline"
          served={bServed}
          waiting={bWaiting}
          barClass="bg-neutral-400"
        />
        <ThroughputRow
          label={mode}
          served={oServed}
          waiting={oWaiting}
          barClass={servedDelta >= 0 ? "bg-emerald-500" : "bg-red-400"}
          strong
        />
      </div>

      {/* ─── Goal function 3 กรณี ───────────────────────── */}
      {typeof results.baseline_case_on_time === "number" &&
        typeof results.case_on_time === "number" && (
          <div className="px-6 py-5 border-t border-neutral-100 space-y-4">
            <SectionLabel>ผู้โดยสารแยกตาม 3 กรณีของ goal function</SectionLabel>
            <CaseRow
              label="Baseline"
              onTime={results.baseline_case_on_time}
              missed={results.baseline_case_missed ?? 0}
              busFull={results.baseline_case_bus_full ?? 0}
            />
            <CaseRow
              label={mode}
              onTime={results.case_on_time}
              missed={results.case_missed ?? 0}
              busFull={results.case_bus_full ?? 0}
              strong
            />
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-neutral-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />มาทันป้ายและขึ้นรถทัน
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />มาไม่ทันป้าย
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />มาทันป้ายแต่รถเต็ม
              </span>
            </div>
          </div>
        )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
      {children}
    </div>
  );
}

function HeadlineImpact({
  waitPct,
  waitDiffAbs,
  totalPct,
  totalDiffAbs,
  mode,
}: {
  waitPct: number;
  waitDiffAbs: number;
  totalPct: number;
  totalDiffAbs: number;
  mode: string;
}) {
  const improved = waitPct < 0;
  const abs = Math.abs(waitPct);
  const headline = improved
    ? `${mode} ลดเวลารอ ${abs.toFixed(1)}%`
    : `${mode} เพิ่มเวลารอ ${abs.toFixed(1)}%`;
  const subline = improved
    ? `ผู้โดยสารรอน้อยลง ${waitDiffAbs.toFixed(2)} นาที · เวลารวมลด ${Math.abs(
        totalPct
      ).toFixed(1)}%`
    : `ลดเวลารวมได้ ${totalDiffAbs.toFixed(2)} นาที (${Math.abs(totalPct).toFixed(
        1
      )}%)`;

  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
          improved ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      <div>
        <div className="text-[18px] font-semibold text-neutral-900 leading-tight">
          {headline}
        </div>
        <div className="text-[13px] text-neutral-600 mt-1">{subline}</div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  sub,
  baseline,
  optimized,
  mode,
  strong,
}: {
  label: string;
  sub: string;
  baseline: number;
  optimized: number;
  mode: string;
  strong?: boolean;
}) {
  const max = Math.max(baseline, optimized, 0.01);
  const bPct = (baseline / max) * 100;
  const oPct = (optimized / max) * 100;
  const change = pctChange(baseline, optimized);
  const improved = change <= 0;

  return (
    <div
      className={strong ? "pt-4 border-t border-neutral-100" : undefined}
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div>
          <div className="text-[13px] font-medium text-neutral-900">{label}</div>
          <div className="text-[11px] text-neutral-500">{sub}</div>
        </div>
        <DeltaChip
          value={change}
          formatter={(v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`}
          invert
        />
      </div>

      <div className="space-y-2">
        <BarRow
          label="Baseline"
          value={`${baseline.toFixed(2)} น.`}
          widthPct={bPct}
          barClass="bg-neutral-300"
          labelClass="text-neutral-500"
        />
        <BarRow
          label={mode}
          value={`${optimized.toFixed(2)} น.`}
          widthPct={oPct}
          barClass={improved ? "bg-emerald-500" : "bg-red-400"}
          labelClass={`font-medium ${improved ? "text-emerald-700" : "text-red-700"}`}
        />
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  widthPct,
  barClass,
  labelClass,
}: {
  label: string;
  value: string;
  widthPct: number;
  barClass: string;
  labelClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-20 text-[11px] shrink-0 ${labelClass ?? "text-neutral-500"}`}>
        {label}
      </div>
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="w-20 text-right text-[12px] font-medium text-neutral-800 tabular-nums shrink-0">
        {value}
      </div>
    </div>
  );
}

function DeltaChip({
  value,
  formatter,
  invert,
}: {
  value: number;
  formatter: (v: number) => string;
  invert: boolean;
}) {
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          good ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      <span className="tabular-nums">{formatter(value)}</span>
    </span>
  );
}

function ThroughputRow({
  label,
  served,
  waiting,
  barClass,
  strong,
}: {
  label: string;
  served: number;
  waiting: number;
  barClass: string;
  strong?: boolean;
}) {
  const total = served + waiting;
  const servedPct = total > 0 ? (served / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] mb-1.5">
        <span
          className={`font-medium ${
            strong ? "text-neutral-900" : "text-neutral-600"
          }`}
        >
          {label}
        </span>
        <span className="text-neutral-500 tabular-nums">
          ให้บริการ{" "}
          <span className="font-semibold text-neutral-900">{served}</span>
          {"  ·  "}รอ{" "}
          <span className="font-semibold text-neutral-900">{waiting}</span>
          {"  ·  "}
          <span className="font-semibold text-neutral-900">
            {servedPct.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden flex">
        <div
          className={`${barClass} h-full transition-all duration-500`}
          style={{ width: `${servedPct}%` }}
          title={`Served: ${served}`}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */

function pctChange(base: number, next: number) {
  if (base === 0) return 0;
  return ((next - base) / base) * 100;
}

function CaseRow({
  label,
  onTime,
  missed,
  busFull,
  strong = false,
}: {
  label: string;
  onTime: number;
  missed: number;
  busFull: number;
  strong?: boolean;
}) {
  const total = onTime + missed + busFull;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className={strong ? "font-semibold text-neutral-900" : "text-neutral-600"}>{label}</span>
        <span className="text-neutral-500 tabular-nums">
          ทัน {pct(onTime).toFixed(1)}% · ไม่ทันป้าย {pct(missed).toFixed(1)}% · รถเต็ม {pct(busFull).toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-neutral-100">
        <div className="bg-emerald-500" style={{ width: `${pct(onTime)}%` }} title={`ทัน: ${onTime}`} />
        <div className="bg-amber-500" style={{ width: `${pct(missed)}%` }} title={`มาไม่ทันป้าย: ${missed}`} />
        <div className="bg-red-400" style={{ width: `${pct(busFull)}%` }} title={`รถเต็ม: ${busFull}`} />
      </div>
    </div>
  );
}
