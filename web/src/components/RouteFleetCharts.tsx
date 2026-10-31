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
  const mode = selectedMode.toUpperCase();
  const maxRoutes = Math.max(baselineSchedule.length, optimizedSchedule.length, 1);
  const maxHeadway = Math.max(
    ...baselineSchedule.map((r) => r.headway || 0),
    ...optimizedSchedule.map((r) => r.headway || 0),
    6
  );

  const totalBuses = optimizedSchedule.reduce((s, r) => s + (r.num_bus || 0), 0);

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-neutral-100">
        <h3 className="text-[15px] font-semibold text-neutral-900">
          ความถี่และการจัดสรรรถของ {mode}
        </h3>
        <p className="text-[12px] text-neutral-500 mt-0.5">
          ระยะห่างระหว่างเที่ยวรถ (headway) และจำนวนรถประจำแต่ละสาย
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
        {/* ─── Headway comparison ──────────────────────────── */}
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-medium text-neutral-900">
              ความถี่ปล่อยรถรายสาย
            </div>
            <div className="text-[11px] text-neutral-500">หน่วย: นาที</div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-[11px] text-neutral-500">
            <LegendDot swatch="bg-neutral-300" label="Baseline" />
            <LegendDot swatch="bg-indigo-500" label={mode} />
          </div>

          <div className="space-y-4">
            {Array.from({ length: maxRoutes }).map((_, idx) => {
              const bRoute = baselineSchedule[idx];
              const oRoute = optimizedSchedule[idx];
              const bHeadway = bRoute?.headway ?? 0;
              const oHeadway = oRoute?.headway ?? 0;
              const diff = oHeadway - bHeadway;
              const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-[12px] mb-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: col.stroke }}
                      />
                      <span className="font-medium text-neutral-900">
                        สาย {idx + 1}
                      </span>
                    </span>

                    {diff !== 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] tabular-nums">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            diff < 0 ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        <span
                          className={
                            diff < 0 ? "text-emerald-700" : "text-amber-700"
                          }
                        >
                          {diff < 0 ? "ถี่ขึ้น" : "ห่างขึ้น"}{" "}
                          {Math.abs(diff).toFixed(1)} น.
                        </span>
                      </span>
                    )}
                  </div>

                  <HeadwayBar
                    label="Baseline"
                    value={bHeadway}
                    widthPct={(bHeadway / maxHeadway) * 100}
                    barClass="bg-neutral-300"
                  />
                  <div className="h-1" />
                  <HeadwayBar
                    label={mode}
                    value={oHeadway}
                    widthPct={(oHeadway / maxHeadway) * 100}
                    barClass="bg-indigo-500"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Fleet distribution ──────────────────────────── */}
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-medium text-neutral-900">
              การจัดสรรรถของ {mode}
            </div>
            <div className="text-[11px] text-neutral-500">
              รวม{" "}
              <span className="font-medium text-neutral-700 tabular-nums">
                {totalBuses || 30}
              </span>{" "}
              คัน
            </div>
          </div>

          {/* Stacked proportion bar */}
          <div>
            <div className="text-[11px] text-neutral-500 mb-1.5">
              สัดส่วนรถในแต่ละสาย
            </div>
            <div className="w-full h-7 rounded-lg overflow-hidden flex border border-neutral-200 bg-neutral-50">
              {optimizedSchedule.map((route, idx) => {
                const buses = route.num_bus || 0;
                const pct = ((buses / (totalBuses || 30)) * 100).toFixed(2);
                const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];
                return (
                  <div
                    key={idx}
                    className="h-full flex items-center justify-center text-white text-[11px] font-semibold tabular-nums transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: col.stroke,
                    }}
                    title={`สาย ${idx + 1}: ${buses} คัน (${pct}%)`}
                  >
                    {Number(pct) > 8 ? buses : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Route cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {optimizedSchedule.map((route, idx) => {
              const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: col.stroke }}
                    />
                    <span className="text-[12px] font-medium text-neutral-900">
                      สาย {idx + 1}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 flex items-baseline justify-between">
                    <span>รถ</span>
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {route.num_bus} คัน
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 flex items-baseline justify-between">
                    <span>รอบ</span>
                    <span className="font-medium text-neutral-700 tabular-nums">
                      {route.cycle_time.toFixed(1)} น.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */

function LegendDot({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${swatch}`} />
      <span>{label}</span>
    </span>
  );
}

function HeadwayBar({
  label,
  value,
  widthPct,
  barClass,
}: {
  label: string;
  value: number;
  widthPct: number;
  barClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-[11px] text-neutral-500 shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="w-14 text-right text-[12px] font-medium text-neutral-800 tabular-nums shrink-0">
        {value.toFixed(1)} น.
      </div>
    </div>
  );
}
