"use client";

import React from "react";
import { RouteSchedule, ROUTE_COLORS } from "@/types/shuttle";

interface RouteFleetChartsProps {
  baselineSchedule?: RouteSchedule[];
  optimizedSchedule?: RouteSchedule[];
  selectedMode: string;
}

export default function RouteFleetCharts({
  baselineSchedule = [],
  optimizedSchedule = [],
  selectedMode,
}: RouteFleetChartsProps) {
  const maxRoutes = Math.max(baselineSchedule.length, optimizedSchedule.length, 1);
  const maxHeadway = Math.max(
    ...baselineSchedule.map((r) => r.headway || 0),
    ...optimizedSchedule.map((r) => r.headway || 0),
    6
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <span>⏱️ Route Headway & Bus Fleet Allocation (กราฟความถี่และการกระจายรถ)</span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          เปรียบเทียบระยะเวลาห่างระหว่างเที่ยวรถ (Headway) และการจัดสรรจำนวนรถบัสรายสาย
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headway Comparison Bar Chart */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              ความถี่การปล่อยรถรายสาย (Headway เปรียบเทียบ)
            </h4>
            <span className="text-xs text-slate-500">(หน่วย: นาที)</span>
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-600 pb-2 border-b border-slate-200">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-blue-400 rounded-sm" />
              <span>Baseline</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-purple-600 rounded-sm" />
              <span>{selectedMode.toUpperCase()} (Optimized)</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {Array.from({ length: maxRoutes }).map((_, idx) => {
              const bRoute = baselineSchedule[idx];
              const oRoute = optimizedSchedule[idx];
              const bHeadway = bRoute ? bRoute.headway : 0;
              const oHeadway = oRoute ? oRoute.headway : 0;
              const diff = oHeadway - bHeadway;
              const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center space-x-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: col.stroke }}
                      />
                      <span>Route {idx + 1}</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Baseline: {bHeadway.toFixed(1)}m | Opt:{" "}
                      <span className="font-bold text-purple-700">
                        {oHeadway.toFixed(1)}m
                      </span>{" "}
                      {diff < 0 ? (
                        <span className="text-emerald-600 font-bold">
                          ({diff.toFixed(1)}m เร็วขึ้น)
                        </span>
                      ) : diff > 0 ? (
                        <span className="text-amber-600">
                          (+{diff.toFixed(1)}m)
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {/* Dual Bar Track */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(bHeadway / maxHeadway) * 100}%` }}
                      />
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(oHeadway / maxHeadway) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bus Fleet Allocation Distribution Chart */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              การจัดสรรกองรถบัส (Bus Fleet Distribution)
            </h4>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              รวม 30 คัน
            </span>
          </div>

          <div className="text-xs text-slate-500 pb-2 border-b border-slate-200">
            แสดงจำนวนรถบัสไฟฟ้าที่วิ่งให้บริการประจำแต่ละเส้นทาง
          </div>

          {/* Visual Bus Stack Bar */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-700 block mb-1">
              สัดส่วนจำนวนรถในแต่ละสาย ({selectedMode.toUpperCase()}):
            </span>
            <div className="w-full h-8 rounded-lg overflow-hidden flex shadow-inner border border-slate-300">
              {optimizedSchedule.map((route, idx) => {
                const buses = route.num_bus || 5;
                const pct = (buses / 30) * 100;
                const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];
                return (
                  <div
                    key={idx}
                    className="h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: col.stroke,
                    }}
                    title={`Route ${idx + 1}: ${buses} คัน (${pct.toFixed(0)}%)`}
                  >
                    R{idx + 1} ({buses})
                  </div>
                );
              })}
            </div>
          </div>

          {/* Route Details Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            {optimizedSchedule.map((route, idx) => {
              const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];
              return (
                <div
                  key={idx}
                  className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex flex-col justify-between space-y-1"
                >
                  <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.stroke }}
                    />
                    <span>Route {idx + 1}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    จำนวนรถ:{" "}
                    <span className="font-bold text-slate-800">
                      {route.num_bus} คัน
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    รอบเวลา (Cycle):{" "}
                    <span className="font-semibold text-purple-700">
                      {route.cycle_time.toFixed(1)} น.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
