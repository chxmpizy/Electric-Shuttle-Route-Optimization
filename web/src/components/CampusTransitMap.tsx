"use client";

import React, { useState, useMemo } from "react";
import { CAMPUS_STOPS, ROUTE_COLORS, RouteSchedule } from "@/types/shuttle";

interface CampusTransitMapProps {
  baselineSchedule?: RouteSchedule[];
  optimizedSchedule?: RouteSchedule[];
  selectedMode: string;
}

export default function CampusTransitMap({
  baselineSchedule = [],
  optimizedSchedule = [],
  selectedMode,
}: CampusTransitMapProps) {
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"side-by-side" | "toggle">("toggle");
  const [activeToggle, setActiveToggle] = useState<"optimized" | "baseline">("optimized");
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [hoveredStop, setHoveredStop] = useState<string | null>(null);

  const svgWidth = 860;
  const svgHeight = 520;
  const padding = 55;

  const bounds = useMemo(() => {
    const lons = Object.values(CAMPUS_STOPS).map((s) => s.lon);
    const lats = Object.values(CAMPUS_STOPS).map((s) => s.lat);
    return {
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }, []);

  const getCoordinates = (stopId: string) => {
    const stop = CAMPUS_STOPS[stopId];
    if (!stop) return { x: svgWidth / 2, y: svgHeight / 2 };

    const x =
      padding +
      ((stop.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) *
        (svgWidth - 2 * padding);
    const y =
      svgHeight -
      padding -
      ((stop.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) *
        (svgHeight - 2 * padding);

    return { x, y };
  };

  const generateRoutePath = (path: string[], routeIdx: number) => {
    if (path.length < 2) return "";
    const offset = (routeIdx - 2.5) * 5;

    const points = path.map((stop) => getCoordinates(stop));
    let d = "";

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (i === 0) {
        d += `M ${pt.x + offset} ${pt.y + offset}`;
      } else {
        const prev = points[i - 1];
        const midX = (prev.x + pt.x) / 2 + offset * 1.5;
        const midY = (prev.y + pt.y) / 2 - offset * 1.5;
        d += ` Q ${midX} ${midY} ${pt.x + offset} ${pt.y + offset}`;
      }
    }
    return d;
  };

  const activeRoutes =
    activeToggle === "optimized" ? optimizedSchedule : baselineSchedule;
  const mode = selectedMode.toUpperCase();

  const renderMapSvg = (
    routes: RouteSchedule[],
    title: string,
    isMini: boolean = false
  ) => {
    const uid = title.replace(/\s+/g, "");
    const totalBuses = routes.reduce((acc, r) => acc + (r.num_bus || 0), 0);

    return (
      <div className="relative rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
        {/* Map header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800/80">
          <div className="text-[13px] font-medium text-neutral-100">{title}</div>
          <div className="text-[11px] text-neutral-400 tabular-nums">
            {routes.length} สาย · {totalBuses} คัน
          </div>
        </div>

        {/* SVG canvas */}
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[460px] select-none"
            style={{ minWidth: isMini ? "360px" : "600px" }}
          >
            <defs>
              {ROUTE_COLORS.map((col, idx) => (
                <marker
                  key={`arrow-${idx}`}
                  id={`arrow-${idx}-${uid}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={col.stroke} />
                </marker>
              ))}

              {/* Subtle single-hue heatmap */}
              <radialGradient id={`heat-high-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`heat-med-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>

              {/* Dot pattern for background */}
              <pattern
                id={`grid-${uid}`}
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="0.8" fill="#262626" />
              </pattern>
            </defs>

            <rect width={svgWidth} height={svgHeight} fill={`url(#grid-${uid})`} />

            {/* Heatmap glow */}
            {showHeatmap &&
              Object.entries(CAMPUS_STOPS).map(([stopId, stop]) => {
                const { x, y } = getCoordinates(stopId);
                const isHigh = stop.weight >= 1000;
                const isMed = stop.weight >= 500 && stop.weight < 1000;
                if (!isHigh && !isMed) return null;

                const radius = isHigh ? 48 : 32;
                return (
                  <circle
                    key={`heat-${stopId}`}
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={`url(#${isHigh ? "heat-high" : "heat-med"}-${uid})`}
                    className="pointer-events-none"
                  />
                );
              })}

            {/* Route paths */}
            {routes.map((route, idx) => {
              const isSelected =
                selectedRouteIdx === null || selectedRouteIdx === idx;
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
              const pathD = generateRoutePath(route.path, idx);

              return (
                <g
                  key={`route-${idx}`}
                  className="transition-opacity duration-300"
                  opacity={isSelected ? 1 : 0.1}
                >
                  {selectedRouteIdx === idx && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth="9"
                      strokeOpacity="0.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color.stroke}
                    strokeWidth={selectedRouteIdx === idx ? 3.5 : 2.25}
                    strokeOpacity={isSelected ? 0.85 : 0.25}
                    markerEnd={`url(#arrow-${idx % ROUTE_COLORS.length}-${uid})`}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* Stop nodes */}
            {Object.entries(CAMPUS_STOPS).map(([stopId, stop]) => {
              const { x, y } = getCoordinates(stopId);
              const isHovered = hoveredStop === stopId;
              const isHighDemand = stop.weight >= 1000;

              const passingRoutes = routes.filter((r) => r.path.includes(stopId));
              const isStopServed = passingRoutes.length > 0;

              const r = isHovered ? 7 : isHighDemand ? 5.5 : 4;
              const fill = isStopServed ? "#f5f5f5" : "#525252";
              const labelY = y > svgHeight - 70 ? -12 : 18;

              return (
                <g
                  key={`stop-${stopId}`}
                  onMouseEnter={() => setHoveredStop(stopId)}
                  onMouseLeave={() => setHoveredStop(null)}
                  className="cursor-pointer"
                >
                  {/* Outer halo on hover */}
                  {isHovered && (
                    <circle
                      cx={x}
                      cy={y}
                      r={r + 5}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeOpacity="0.5"
                    />
                  )}

                  {/* Node */}
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={fill}
                    stroke="#0a0a0a"
                    strokeWidth="2"
                  />

                  {/* Inner dot for high demand (dark) */}
                  {isHighDemand && (
                    <circle cx={x} cy={y} r={r - 2.5} fill="#f59e0b" />
                  )}

                  {/* Label */}
                  <text
                    x={x}
                    y={y + labelY}
                    textAnchor="middle"
                    fontSize={isHovered ? "12" : "11"}
                    fontWeight={isHovered ? "600" : "500"}
                    fill={isHovered ? "#fef3c7" : "#e5e5e5"}
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                  >
                    {stop.nameTh}
                  </text>

                  {/* Weight label for high demand */}
                  {showHeatmap && isHighDemand && (
                    <text
                      x={x}
                      y={y + labelY + 13}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#f59e0b"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                    >
                      {stop.weight} คน
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover tooltip */}
        {hoveredStop && CAMPUS_STOPS[hoveredStop] && (
          <div className="absolute bottom-3 left-3 right-3 bg-neutral-900/95 backdrop-blur border border-neutral-700/60 px-4 py-3 rounded-lg text-neutral-100 flex flex-wrap items-start justify-between gap-3 z-20">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-neutral-100">
                  {CAMPUS_STOPS[hoveredStop].nameTh}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {CAMPUS_STOPS[hoveredStop].nameEn}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded-md tabular-nums">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  {CAMPUS_STOPS[hoveredStop].weight} คน
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                {CAMPUS_STOPS[hoveredStop].desc}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-neutral-500">สายที่ผ่าน</span>
              {routes.map((r, i) => {
                if (!r.path.includes(hoveredStop)) return null;
                const col = ROUTE_COLORS[i % ROUTE_COLORS.length];
                return (
                  <span
                    key={i}
                    className="text-[10px] font-semibold w-5 h-5 rounded-md inline-flex items-center justify-center text-white"
                    style={{ backgroundColor: col.stroke }}
                  >
                    {i + 1}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-neutral-100 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-neutral-900">
            โครงข่ายเส้นทางเดินรถ
          </h3>
          <p className="text-[12px] text-neutral-500 mt-0.5">
            เปรียบเทียบเส้นทางและจุดจอดตามพิกัดจริงของ มธ. ศูนย์รังสิต
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Heatmap toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border text-[12px] font-medium transition ${
              showHeatmap
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                showHeatmap ? "bg-amber-500" : "bg-neutral-400"
              }`}
            />
            <span>{showHeatmap ? "ซ่อน Demand" : "แสดง Demand"}</span>
          </button>

          {/* View segmented */}
          <div className="inline-flex p-0.5 bg-neutral-100 rounded-lg">
            <button
              onClick={() => setViewMode("toggle")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition ${
                viewMode === "toggle"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              สลับมุมมอง
            </button>
            <button
              onClick={() => setViewMode("side-by-side")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition ${
                viewMode === "side-by-side"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              เคียงข้าง
            </button>
          </div>
        </div>
      </div>

      {/* Route filter chips */}
      <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-neutral-500 mr-1">เลือกดูสาย</span>
        <button
          onClick={() => setSelectedRouteIdx(null)}
          className={`h-7 px-2.5 inline-flex items-center rounded-md text-[12px] font-medium transition ${
            selectedRouteIdx === null
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          ทั้งหมด
        </button>
        {activeRoutes.map((route, idx) => {
          const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          const isSelected = selectedRouteIdx === idx;
          return (
            <button
              key={idx}
              onClick={() => setSelectedRouteIdx(isSelected ? null : idx)}
              className={`h-7 pl-2 pr-2.5 inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium transition ${
                isSelected
                  ? "bg-neutral-100 ring-1 ring-neutral-300 text-neutral-900"
                  : "bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: col.stroke }}
              />
              <span>สาย {idx + 1}</span>
              <span className="text-neutral-400 tabular-nums">
                {route.num_bus}
              </span>
            </button>
          );
        })}
      </div>

      {/* Map area */}
      <div className="p-6 space-y-4">
        {viewMode === "toggle" ? (
          <>
            {/* Baseline vs Optimized segmented */}
            <div className="inline-flex p-0.5 bg-neutral-100 rounded-lg">
              <button
                onClick={() => setActiveToggle("baseline")}
                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition ${
                  activeToggle === "baseline"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Baseline
              </button>
              <button
                onClick={() => setActiveToggle("optimized")}
                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition ${
                  activeToggle === "optimized"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {mode} (Optimized)
              </button>
            </div>

            {activeToggle === "baseline"
              ? renderMapSvg(baselineSchedule, "Baseline (เส้นทางเดิม)")
              : renderMapSvg(optimizedSchedule, `Optimized · ${mode}`)}
          </>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              {renderMapSvg(baselineSchedule, "Baseline", true)}
              <div className="mt-2 text-[11px] text-neutral-500 text-center">
                เส้นทางเดิม ความถี่ไม่สอดคล้องกับจุดผู้โดยสารหนาแน่น
              </div>
            </div>
            <div>
              {renderMapSvg(optimizedSchedule, `Optimized · ${mode}`, true)}
              <div className="mt-2 text-[11px] text-neutral-600 text-center">
                เส้นทางที่ปรับโดย {mode} เชื่อมหอพักและอาคารเรียนรวมได้ตรงจุด
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-neutral-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-neutral-600">
        <span className="font-medium text-neutral-500">คำอธิบาย</span>
        <LegendItem>
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 ring-1 ring-neutral-900 inline-block" />
          ป้ายทั่วไป
        </LegendItem>
        <LegendItem>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          ป้ายหนาแน่น (&gt; 1,000 คน)
        </LegendItem>
        <LegendItem>
          <span className="w-6 h-0.5 bg-neutral-400 inline-block" />
          เส้นทางและทิศทาง
        </LegendItem>
        <span className="ml-auto text-neutral-400">
          คลิก/ชี้ที่ป้ายเพื่อดูสายที่ผ่านและ demand
        </span>
      </div>
    </section>
  );
}

function LegendItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">{children}</span>
  );
}
