"use client";

import React, { useState } from "react";
import { BenchmarkAlgorithmData } from "@/types/shuttle";

export const DEFAULT_BENCHMARK_DATA: Record<string, BenchmarkAlgorithmData> = {
  baseline: {
    algorithm: "BASELINE",
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
    algorithm: "GA (Genetic)",
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
    algorithm: "SA (Annealing)",
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
    algorithm: "PSO (Particle)",
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
    algorithm: "ACO (Ant Colony)",
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

const ALGO_COLORS: Record<string, { bar: string; text: string; bg: string; border: string }> = {
  baseline: { bar: "bg-slate-400", text: "text-slate-700", bg: "bg-slate-100", border: "border-slate-300" },
  ga: { bar: "bg-blue-600", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  sa: { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  pso: { bar: "bg-indigo-600", text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  aco: { bar: "bg-emerald-600", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
};

interface BenchmarkComparisonChartProps {
  currentAlgorithm?: string;
  customData?: Record<string, BenchmarkAlgorithmData>;
}

export default function BenchmarkComparisonChart({
  currentAlgorithm = "baseline",
  customData,
}: BenchmarkComparisonChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<"wait_time" | "travel_time" | "total_time" | "avg_headway">(
    "wait_time"
  );

  const benchmarkData = customData || DEFAULT_BENCHMARK_DATA;
  const algos = ["baseline", "ga", "sa", "pso", "aco"];

  const metricConfig = {
    wait_time: {
      title: "เวลารอรถเฉลี่ย (Average Wait Time)",
      unit: "นาที",
      desc: "ยิ่งน้อยยิ่งดี — แสดงความรวดเร็วที่ผู้โดยสารรอรถที่ป้าย",
      max: 3.0,
      baselineVal: benchmarkData.baseline?.wait_time ?? 2.37,
    },
    travel_time: {
      title: "เวลาเดินทางบนรถเฉลี่ย (Average Travel Time)",
      unit: "นาที",
      desc: "เวลาที่ผู้โดยสารนั่งอยู่บนรถจนถึงจุดหมาย",
      max: 14.0,
      baselineVal: benchmarkData.baseline?.travel_time ?? 11.38,
    },
    total_time: {
      title: "เวลารวมทั้งสิ้น (Total Journey Time)",
      unit: "นาที",
      desc: "ผลรวมเวลารอ + เวลาเดินทางของผู้โดยสารในระบบ",
      max: 16.0,
      baselineVal: benchmarkData.baseline?.total_time ?? 13.75,
    },
    avg_headway: {
      title: "ความถี่การปล่อยรถเฉลี่ย (Average Headway)",
      unit: "นาที/คัน",
      desc: "ช่วงเวลาระหว่างรถคันก่อนหน้าและคันถัดไป",
      max: 5.0,
      baselineVal: benchmarkData.baseline?.avg_headway ?? 3.77,
    },
  };

  const currentConfig = metricConfig[selectedMetric];

  // Sort algorithms by current metric ascending (lower is better)
  const rankedAlgos = [...algos].sort((a, b) => {
    const valA = benchmarkData[a]?.[selectedMetric] ?? 999;
    const valB = benchmarkData[b]?.[selectedMetric] ?? 999;
    return valA - valB;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span>🏆 All-Algorithms Benchmark (เปรียบเทียบภาพรวมทุกอัลกอริทึม)</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            เปรียบเทียบประสิทธิภาพการเพิ่มประสิทธิภาพเส้นทางระหว่าง Metaheuristics ทั้ง 4 แบบ กับระบบ Baseline
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 self-start md:self-auto overflow-x-auto">
          <button
            onClick={() => setSelectedMetric("wait_time")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              selectedMetric === "wait_time"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ⏳ เวลารอ (Wait)
          </button>
          <button
            onClick={() => setSelectedMetric("travel_time")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              selectedMetric === "travel_time"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ⏱️ เวลาเดินทาง (Travel)
          </button>
          <button
            onClick={() => setSelectedMetric("total_time")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              selectedMetric === "total_time"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🚶 เวลารวม (Total)
          </button>
          <button
            onClick={() => setSelectedMetric("avg_headway")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              selectedMetric === "avg_headway"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🚌 ความถี่ (Headway)
          </button>
        </div>
      </div>

      {/* Main Bar Chart Comparison */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-sm">
            {currentConfig.title}
          </span>
          <span className="text-xs text-slate-500">{currentConfig.desc}</span>
        </div>

        {/* Horizontal Bar Visual Graph */}
        <div className="space-y-3 pt-2">
          {algos.map((algoKey) => {
            const data = benchmarkData[algoKey];
            if (!data) return null;

            const value = data[selectedMetric] as number;
            const percentage = Math.min(100, (value / currentConfig.max) * 100);
            const isSelected = currentAlgorithm.toLowerCase() === algoKey;
            const diffWithBaseline = value - currentConfig.baselineVal;
            const pctWithBaseline =
              currentConfig.baselineVal > 0
                ? (diffWithBaseline / currentConfig.baselineVal) * 100
                : 0;
            const colors = ALGO_COLORS[algoKey] || ALGO_COLORS.baseline;

            return (
              <div
                key={algoKey}
                className={`p-3 rounded-lg border transition-all ${
                  isSelected
                    ? "bg-white border-blue-400 shadow-md ring-2 ring-blue-100"
                    : "bg-white/70 border-slate-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}
                    >
                      {data.algorithm}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">
                        Active Selection
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {value.toFixed(2)} {currentConfig.unit}
                    </span>
                    {algoKey !== "baseline" && (
                      <span
                        className={`font-semibold text-[11px] px-1.5 py-0.2 rounded ${
                          diffWithBaseline <= 0
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-red-600 bg-red-50"
                        }`}
                      >
                        {diffWithBaseline <= 0 ? "ลดลง " : "+"}
                        {Math.abs(pctWithBaseline).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Bar Track */}
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
                  <div
                    className={`h-4 rounded-full transition-all duration-700 ${colors.bar} shadow-inner`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard & Summary Ranking Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1st Place */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
            <span>🥇 อันดับที่ 1 (ดีที่สุดในหัวข้อนี้)</span>
          </div>
          <div className="mt-2 text-lg font-extrabold text-amber-950">
            {benchmarkData[rankedgos(0)]?.algorithm}
          </div>
          <div className="text-xs text-amber-700 mt-1">
            {benchmarkData[rankedgos(0)]?.[selectedMetric]?.toFixed(2)}{" "}
            {currentConfig.unit} (เร็วขึ้นอย่างโดดเด่น)
          </div>
        </div>

        {/* 2nd Place */}
        <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm">
            <span>🥈 อันดับที่ 2</span>
          </div>
          <div className="mt-2 text-lg font-extrabold text-slate-900">
            {benchmarkData[rankedgos(1)]?.algorithm}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {benchmarkData[rankedgos(1)]?.[selectedMetric]?.toFixed(2)}{" "}
            {currentConfig.unit}
          </div>
        </div>

        {/* 3rd Place */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50/50 p-4 rounded-xl border border-orange-200">
          <div className="flex items-center space-x-2 text-orange-800 font-bold text-sm">
            <span>🥉 อันดับที่ 3</span>
          </div>
          <div className="mt-2 text-lg font-extrabold text-orange-950">
            {benchmarkData[rankedgos(2)]?.algorithm}
          </div>
          <div className="text-xs text-orange-700 mt-1">
            {benchmarkData[rankedgos(2)]?.[selectedMetric]?.toFixed(2)}{" "}
            {currentConfig.unit}
          </div>
        </div>
      </div>
    </div>
  );

  function rankedgos(index: number) {
    return rankedAlgos[index] || "baseline";
  }
}
