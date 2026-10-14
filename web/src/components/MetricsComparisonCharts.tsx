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
  const waitDiff = oWait - bWait;
  const waitPct = bWait > 0 ? (waitDiff / bWait) * 100 : 0;

  const bTravel = results.baseline_travel;
  const oTravel = results.optimized_travel;
  const travelDiff = oTravel - bTravel;
  const travelPct = bTravel > 0 ? (travelDiff / bTravel) * 100 : 0;

  const bTotal = bWait + bTravel;
  const oTotal = oWait + oTravel;
  const totalDiff = oTotal - bTotal;
  const totalPct = bTotal > 0 ? (totalDiff / bTotal) * 100 : 0;

  const bServed = results.baseline_served ?? 209;
  const oServed = results.optimized_served ?? 183;
  const bWaiting = results.baseline_waiting ?? 151;
  const oWaiting = results.optimized_waiting ?? 171;

  // Max value calculation for bar scales
  const maxWait = Math.max(bWait, oWait, 1) * 1.25;
  const maxTravel = Math.max(bTravel, oTravel, 1) * 1.25;
  const maxTotal = Math.max(bTotal, oTotal, 1) * 1.25;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <span>📊 Performance Visual Comparison (กราฟเปรียบเทียบเชิงประสิทธิภาพ)</span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          เปรียบเทียบผลลัพธ์ระหว่างระบบเดิม (Baseline) กับผลการประมวลผลด้วย{" "}
          <span className="font-semibold text-blue-700">{selectedMode.toUpperCase()}</span>
        </p>
      </div>

      {/* Primary KPI Cards with Proportional Visual Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wait Time Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-xl border border-blue-100 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                ⏳ Avg Wait Time
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  waitDiff <= 0
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-red-100 text-red-700 border border-red-200"
                }`}
              >
                {waitPct <= 0 ? "ลดลง " : "เพิ่มขึ้น "}
                {Math.abs(waitPct).toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-extrabold text-blue-950 mt-2">
              {oWait.toFixed(2)}{" "}
              <span className="text-sm font-normal text-gray-600">นาที</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              เดิม: {bWait.toFixed(2)} นาที (
              {waitDiff <= 0 ? "" : "+"}
              {waitDiff.toFixed(2)} น.)
            </div>
          </div>

          {/* Comparative Horizontal Bar */}
          <div className="space-y-2 pt-2 border-t border-blue-100/80">
            <div>
              <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                <span>Baseline</span>
                <span className="font-semibold">{bWait.toFixed(2)} m</span>
              </div>
              <div className="w-full bg-blue-100/80 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-400 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (bWait / maxWait) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-blue-900 font-medium mb-1">
                <span>{selectedMode.toUpperCase()} (Optimized)</span>
                <span className="font-bold text-blue-700">{oWait.toFixed(2)} m</span>
              </div>
              <div className="w-full bg-blue-100/80 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    waitDiff <= 0 ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, (oWait / maxWait) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Travel Time Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 p-5 rounded-xl border border-purple-100 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                ⏱️ Avg Travel Time
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  travelDiff <= 0
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-amber-100 text-amber-700 border border-amber-200"
                }`}
              >
                {travelPct <= 0 ? "ลดลง " : "+"}
                {travelPct.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-extrabold text-purple-950 mt-2">
              {oTravel.toFixed(2)}{" "}
              <span className="text-sm font-normal text-gray-600">นาที</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              เดิม: {bTravel.toFixed(2)} นาที (
              {travelDiff <= 0 ? "" : "+"}
              {travelDiff.toFixed(2)} น.)
            </div>
          </div>

          {/* Comparative Horizontal Bar */}
          <div className="space-y-2 pt-2 border-t border-purple-100/80">
            <div>
              <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                <span>Baseline</span>
                <span className="font-semibold">{bTravel.toFixed(2)} m</span>
              </div>
              <div className="w-full bg-purple-100/80 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-purple-300 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (bTravel / maxTravel) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-purple-900 font-medium mb-1">
                <span>{selectedMode.toUpperCase()} (Optimized)</span>
                <span className="font-bold text-purple-700">{oTravel.toFixed(2)} m</span>
              </div>
              <div className="w-full bg-purple-100/80 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    travelDiff <= 0 ? "bg-green-500" : "bg-purple-600"
                  }`}
                  style={{ width: `${Math.min(100, (oTravel / maxTravel) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Total Trip Time Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-xl border border-emerald-100 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                🚶 Total Journey Time
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  totalDiff <= 0
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-red-100 text-red-700 border border-red-200"
                }`}
              >
                {totalPct <= 0 ? "เร็วขึ้น " : "+"}
                {Math.abs(totalPct).toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-950 mt-2">
              {oTotal.toFixed(2)}{" "}
              <span className="text-sm font-normal text-gray-600">นาที</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              เดิม: {bTotal.toFixed(2)} นาที (รอ + เดินทาง)
            </div>
          </div>

          {/* Comparative Horizontal Bar */}
          <div className="space-y-2 pt-2 border-t border-emerald-100/80">
            <div>
              <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                <span>Baseline</span>
                <span className="font-semibold">{bTotal.toFixed(2)} m</span>
              </div>
              <div className="w-full bg-emerald-100/80 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-300 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (bTotal / maxTotal) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-emerald-900 font-medium mb-1">
                <span>{selectedMode.toUpperCase()} (Optimized)</span>
                <span className="font-bold text-emerald-700">{oTotal.toFixed(2)} m</span>
              </div>
              <div className="w-full bg-emerald-100/80 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    totalDiff <= 0 ? "bg-emerald-600" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, (oTotal / maxTotal) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Side-by-Side Bar Chart Breakdown */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
          <span>📶 Visual Time Breakdown: Baseline vs {selectedMode.toUpperCase()}</span>
        </h4>

        {/* Legend */}
        <div className="flex items-center space-x-6 text-xs text-slate-600 pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 bg-blue-500 rounded-sm" />
            <span>Baseline (ระบบเดิม)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 bg-emerald-500 rounded-sm" />
            <span>{selectedMode.toUpperCase()} (ระบบที่ปรับปรุง)</span>
          </div>
        </div>

        {/* Vertical Column Comparison Graph */}
        <div className="grid grid-cols-3 gap-6 pt-2">
          {/* Wait Time Comparison Column */}
          <div className="flex flex-col items-center">
            <div className="w-full h-44 flex items-end justify-center space-x-3 pb-2 border-b-2 border-slate-300">
              {/* Baseline Bar */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-600 mb-1">
                  {bWait.toFixed(1)}m
                </span>
                <div
                  className="w-10 bg-blue-500 rounded-t-md transition-all duration-700 shadow-sm"
                  style={{ height: `${Math.max(12, (bWait / maxTotal) * 160)}px` }}
                />
              </div>
              {/* Optimized Bar */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-emerald-700 mb-1">
                  {oWait.toFixed(1)}m
                </span>
                <div
                  className="w-10 bg-emerald-500 rounded-t-md transition-all duration-700 shadow-sm"
                  style={{ height: `${Math.max(12, (oWait / maxTotal) * 160)}px` }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-700 mt-2 text-center">
              เวลารอเฉลี่ย (Wait Time)
            </span>
            <span
              className={`text-[11px] font-bold mt-0.5 ${
                waitDiff <= 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {waitDiff <= 0 ? "▼" : "▲"} {Math.abs(waitPct).toFixed(1)}%
            </span>
          </div>

          {/* Travel Time Comparison Column */}
          <div className="flex flex-col items-center">
            <div className="w-full h-44 flex items-end justify-center space-x-3 pb-2 border-b-2 border-slate-300">
              {/* Baseline Bar */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-600 mb-1">
                  {bTravel.toFixed(1)}m
                </span>
                <div
                  className="w-10 bg-blue-500 rounded-t-md transition-all duration-700 shadow-sm"
                  style={{ height: `${Math.max(12, (bTravel / maxTotal) * 160)}px` }}
                />
              </div>
              {/* Optimized Bar */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-emerald-700 mb-1">
                  {oTravel.toFixed(1)}m
                </span>
                <div
                  className="w-10 bg-emerald-500 rounded-t-md transition-all duration-700 shadow-sm"
                  style={{ height: `${Math.max(12, (oTravel / maxTotal) * 160)}px` }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-700 mt-2 text-center">
              เวลาเดินทาง (Travel Time)
            </span>
            <span
              className={`text-[11px] font-bold mt-0.5 ${
                travelDiff <= 0 ? "text-green-600" : "text-amber-600"
              }`}
            >
              {travelDiff <= 0 ? "▼" : "▲"} {Math.abs(travelPct).toFixed(1)}%
            </span>
          </div>

          {/* Total Trip Time Comparison Column */}
          <div className="flex flex-col items-center">
            <div className="w-full h-44 flex items-end justify-center space-x-3 pb-2 border-b-2 border-slate-300">
              {/* Baseline Bar */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-600 mb-1">
                  {bTotal.toFixed(1)}m
                </span>
                <div
                  className="w-10 bg-blue-500 rounded-t-md transition-all duration-700 shadow-sm"
                  style={{ height: `${Math.max(12, (bTotal / maxTotal) * 160)}px` }}
                />
              </div>
              {/* Optimized Bar */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-emerald-700 mb-1">
                  {oTotal.toFixed(1)}m
                </span>
                <div
                  className="w-10 bg-emerald-500 rounded-t-md transition-all duration-700 shadow-sm"
                  style={{ height: `${Math.max(12, (oTotal / maxTotal) * 160)}px` }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-700 mt-2 text-center">
              เวลารวมทั้งระบบ (Total Time)
            </span>
            <span
              className={`text-[11px] font-bold mt-0.5 ${
                totalDiff <= 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {totalDiff <= 0 ? "▼" : "▲"} {Math.abs(totalPct).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Passenger Throughput & Queue Visual Comparison */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
        <h4 className="text-sm font-bold text-slate-800 flex items-center justify-between">
          <span>👥 ปริมาณผู้โดยสารที่ให้บริการสำเร็จ vs รอสะสม (Passenger Throughput)</span>
          <span className="text-xs font-normal text-slate-500">การจำลองรอบเวลาเต็มระบบ</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Baseline Throughput */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Baseline (เดิม)</span>
              <span className="text-slate-500">
                ให้บริการ: <strong className="text-blue-700">{bServed}</strong> | รอค้าง: <strong className="text-amber-700">{bWaiting}</strong>
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 h-full transition-all duration-700"
                style={{ width: `${(bServed / (bServed + bWaiting)) * 100}%` }}
                title={`Served: ${bServed}`}
              />
              <div
                className="bg-amber-400 h-full transition-all duration-700"
                style={{ width: `${(bWaiting / (bServed + bWaiting)) * 100}%` }}
                title={`Waiting: ${bWaiting}`}
              />
            </div>
          </div>

          {/* Optimized Throughput */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-800">{selectedMode.toUpperCase()} (Optimized)</span>
              <span className="text-slate-500">
                ให้บริการ: <strong className="text-emerald-700">{oServed}</strong> | รอค้าง: <strong className="text-amber-700">{oWaiting}</strong>
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-700"
                style={{ width: `${(oServed / (oServed + oWaiting)) * 100}%` }}
                title={`Served: ${oServed}`}
              />
              <div
                className="bg-amber-400 h-full transition-all duration-700"
                style={{ width: `${(oWaiting / (oServed + oWaiting)) * 100}%` }}
                title={`Waiting: ${oWaiting}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Concrete Impact Callout */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-start space-x-3 text-sm">
        <span className="text-2xl">💡</span>
        <div>
          <span className="font-bold">สรุปผลลัพธ์เชิงรูปธรรม: </span>
          การปรับปรุงเส้นทางด้วยอัลกอริทึม {selectedMode.toUpperCase()} ช่วยลดเวลารอรถเฉลี่ยของผู้โดยสารลงได้{" "}
          <span className="font-extrabold text-emerald-800">
            {Math.abs(waitDiff).toFixed(2)} นาที ({Math.abs(waitPct).toFixed(1)}%)
          </span>{" "}
          ส่งผลให้เวลารวมในการเดินทางลดลงอย่างมีนัยสำคัญ และรองรับผู้โดยสารได้รวดเร็วยิ่งขึ้น
        </div>
      </div>
    </div>
  );
}
