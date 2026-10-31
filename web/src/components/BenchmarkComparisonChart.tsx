"use client";

import React, { useState } from "react";
import { BenchmarkAlgorithmData } from "@/types/shuttle";

export const DEFAULT_BENCHMARK_DATA: Record<string, BenchmarkAlgorithmData> = {
  baseline: {
    algorithm: "Baseline",
    wait_time: 2.37,
    travel_time: 11.38,
    total_time: 13.75,
    served: 209,
    waiting: 151,
    num_routes: 6,
    total_buses: 30,
    avg_headway: 3.77,
  },
  ga: {
    algorithm: "GA",
    wait_time: 1.59,
    travel_time: 10.34,
    total_time: 11.93,
    served: 183,
    waiting: 171,
    num_routes: 6,
    total_buses: 30,
    avg_headway: 3.4,
  },
  sa: {
    algorithm: "SA",
    wait_time: 0.34,
    travel_time: 2.93,
    total_time: 3.27,
    served: 163,
    waiting: 192,
    num_routes: 6,
    total_buses: 30,
    avg_headway: 1.01,
  },
  pso: {
    algorithm: "PSO",
    wait_time: 1.36,
    travel_time: 11.55,
    total_time: 12.91,
    served: 305,
    waiting: 52,
    num_routes: 6,
    total_buses: 30,
    avg_headway: 3.07,
  },
  aco: {
    algorithm: "ACO",
    wait_time: 1.31,
    travel_time: 9.35,
    total_time: 10.66,
    served: 282,
    waiting: 71,
    num_routes: 6,
    total_buses: 30,
    avg_headway: 3.0,
  },
};

type MetricKey = "wait_time" | "travel_time" | "total_time" | "avg_headway";

const ALL_ALGOS = ["baseline", "ga", "sa", "pso", "aco"] as const;

const METRIC_CONFIG: Record<
  MetricKey,
  { title: string; sub: string; unit: string; max: number }
> = {
  wait_time: {
    title: "เวลารอรถเฉลี่ย",
    sub: "ยิ่งน้อยยิ่งดี — ผู้โดยสารรอรถที่ป้ายสั้นลง",
    unit: "นาที",
    max: 3.0,
  },
  travel_time: {
    title: "เวลาเดินทางบนรถเฉลี่ย",
    sub: "เวลาที่ผู้โดยสารนั่งอยู่บนรถจนถึงจุดหมาย",
    unit: "นาที",
    max: 14.0,
  },
  total_time: {
    title: "เวลารวมทั้งสิ้น",
    sub: "ผลรวมเวลารอ + เวลาเดินทางของผู้โดยสาร",
    unit: "นาที",
    max: 16.0,
  },
  avg_headway: {
    title: "ความถี่การปล่อยรถเฉลี่ย",
    sub: "ช่วงเวลาระหว่างรถคันก่อนและคันถัดไป",
    unit: "นาที/คัน",
    max: 5.0,
  },
};

const METRIC_TABS: Array<{ key: MetricKey; label: string }> = [
  { key: "wait_time", label: "เวลารอ" },
  { key: "travel_time", label: "เวลาเดินทาง" },
  { key: "total_time", label: "เวลารวม" },
  { key: "avg_headway", label: "ความถี่" },
];

interface Props {
  currentAlgorithm?: string;
  customData?: Record<string, BenchmarkAlgorithmData>;
}

export default function BenchmarkComparisonChart({
  currentAlgorithm = "baseline",
  customData,
}: Props) {
  const [metric, setMetric] = useState<MetricKey>("wait_time");

  const data = customData || DEFAULT_BENCHMARK_DATA;
  const cfg = METRIC_CONFIG[metric];
  const baselineVal = data.baseline?.[metric] ?? 1;

  const ranked = [...ALL_ALGOS].sort((a, b) => {
    const av = (data[a]?.[metric] as number) ?? 999;
    const bv = (data[b]?.[metric] as number) ?? 999;
    return av - bv;
  });

  const bestKey = ranked[0];
  const current = currentAlgorithm.toLowerCase();

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-neutral-100 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-neutral-900">
            เปรียบเทียบทุกอัลกอริทึม
          </h3>
          <p className="text-[12px] text-neutral-500 mt-0.5">
            ประสิทธิภาพของ GA / SA / PSO / ACO เทียบกับ Baseline
          </p>
        </div>

        {/* Metric tabs */}
        <div className="inline-flex p-0.5 bg-neutral-100 rounded-lg">
          {METRIC_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setMetric(t.key)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition ${
                metric === t.key
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric body */}
      <div className="px-6 py-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-[13px] font-medium text-neutral-900">
              {cfg.title}
            </div>
            <div className="text-[11px] text-neutral-500">{cfg.sub}</div>
          </div>
          <div className="text-[11px] text-neutral-500">
            หน่วย: <span className="font-medium text-neutral-700">{cfg.unit}</span>
          </div>
        </div>

        {/* Ranked rows (sorted best → worst) */}
        <div className="space-y-2.5">
          {ranked.map((key, idx) => {
            const row = data[key];
            if (!row) return null;
            const value = row[metric] as number;
            const pct = Math.min(100, (value / cfg.max) * 100);
            const isActive = current === key;
            const isBest = key === bestKey;
            const isBaseline = key === "baseline";
            const diff = value - baselineVal;
            const diffPct = baselineVal > 0 ? (diff / baselineVal) * 100 : 0;

            // Bar color: best → emerald, active → indigo, baseline → neutral-300, others → neutral-400
            const barClass = isBest
              ? "bg-emerald-500"
              : isActive
              ? "bg-indigo-500"
              : isBaseline
              ? "bg-neutral-300"
              : "bg-neutral-400";

            return (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-lg py-1.5 pl-2 pr-3 -mx-2 transition ${
                  isActive ? "bg-indigo-50/60" : ""
                }`}
              >
                {/* Rank */}
                <div className="w-6 shrink-0 text-center">
                  <span
                    className={`inline-block text-[11px] font-semibold tabular-nums ${
                      isBest ? "text-emerald-600" : "text-neutral-400"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                </div>

                {/* Algorithm name */}
                <div className="w-28 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-neutral-900">
                      {row.algorithm}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-semibold text-indigo-600 uppercase tracking-wide">
                        active
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div className="flex-1 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Value */}
                <div className="w-16 text-right text-[13px] font-semibold text-neutral-900 tabular-nums shrink-0">
                  {value.toFixed(2)}
                </div>

                {/* vs baseline chip */}
                <div className="w-20 text-right shrink-0">
                  {isBaseline ? (
                    <span className="text-[11px] text-neutral-400">—</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium tabular-nums">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          diff <= 0 ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      <span
                        className={
                          diff <= 0 ? "text-emerald-700" : "text-red-700"
                        }
                      >
                        {diff <= 0 ? "−" : "+"}
                        {Math.abs(diffPct).toFixed(1)}%
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Winner callout */}
        <div className="mt-5 flex items-start gap-2.5 px-4 py-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <div className="text-[13px] text-neutral-700">
            <span className="font-semibold text-neutral-900">
              {data[bestKey]?.algorithm}
            </span>{" "}
            ทำได้ดีที่สุดในหัวข้อนี้ที่{" "}
            <span className="font-semibold text-neutral-900 tabular-nums">
              {(data[bestKey]?.[metric] as number).toFixed(2)} {cfg.unit}
            </span>
            {bestKey !== "baseline" && (
              <>
                {" — ดีกว่า Baseline "}
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {(
                    ((baselineVal -
                      (data[bestKey]?.[metric] as number)) /
                      Math.max(baselineVal, 0.001)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
