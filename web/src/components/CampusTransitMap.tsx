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

  // Map dimensions
  const svgWidth = 860;
  const svgHeight = 520;
  const padding = 55;

  // Calculate coordinates bounds
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
    // Invert Y because latitude goes North (up) but SVG y goes down
    const y =
      svgHeight -
      padding -
      ((stop.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) *
        (svgHeight - 2 * padding);

    return { x, y };
  };

  // Generate SVG path for a route with slight curve offset for overlaps
  const generateRoutePath = (path: string[], routeIdx: number) => {
    if (path.length < 2) return "";
    const offset = (routeIdx - 2.5) * 5; // slight separation between overlapping routes

    const points = path.map((stop) => getCoordinates(stop));
    let d = "";

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (i === 0) {
        d += `M ${pt.x + offset} ${pt.y + offset}`;
      } else {
        const prev = points[i - 1];
        // Calculate curve control point
        const midX = (prev.x + pt.x) / 2 + offset * 1.5;
        const midY = (prev.y + pt.y) / 2 - offset * 1.5;
        d += ` Q ${midX} ${midY} ${pt.x + offset} ${pt.y + offset}`;
      }
    }
    return d;
  };

  const activeRoutes =
    activeToggle === "optimized" ? optimizedSchedule : baselineSchedule;

  const renderMapSvg = (
    routes: RouteSchedule[],
    title: string,
    badgeColor: string,
    isMini: boolean = false
  ) => {
    return (
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-xl p-4 shadow-inner border border-slate-800 overflow-hidden">
        {/* Title & Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span
              className={`w-3 h-3 rounded-full ${
                badgeColor === "blue" ? "bg-blue-500" : "bg-purple-500"
              } animate-pulse`}
            />
            <h4 className="text-white font-bold text-sm md:text-base tracking-wide">
              {title}
            </h4>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            {routes.length} สาย ({routes.reduce((acc, r) => acc + (r.num_bus || 0), 0)} คัน)
          </span>
        </div>

        {/* SVG Canvas */}
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[460px] select-none"
            style={{ minWidth: isMini ? "360px" : "600px" }}
          >
            <defs>
              {/* Arrow markers for routes */}
              {ROUTE_COLORS.map((col, idx) => (
                <marker
                  key={`arrow-${idx}`}
                  id={`arrow-${idx}-${title.replace(/\s+/g, "")}`}
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

              {/* Heatmap Gradients */}
              <radialGradient id="heat-high" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                <stop offset="60%" stopColor="#f97316" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heat-med" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                <stop offset="70%" stopColor="#eab308" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
              </radialGradient>

              {/* Grid pattern */}
              <pattern
                id="campus-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeOpacity="0.3"
                />
              </pattern>
            </defs>

            {/* Campus Background Grid */}
            <rect width={svgWidth} height={svgHeight} fill="url(#campus-grid)" />

            {/* Thammasat Landmark Labels */}
            <g opacity="0.4" className="text-slate-500 font-mono text-[11px]">
              <text x="35" y="495">⬅️ ประตูเชียงราก 2 / ทียูดอม</text>
              <text x="640" y="35">รพ.ธรรมศาสตร์ ➡️</text>
              <text x="360" y="30" textAnchor="middle">
                TU RANGSIT CAMPUS TRANSIT NETWORK
              </text>
            </g>

            {/* Passenger Demand Heatmap Glow (Underneath routes) */}
            {showHeatmap &&
              Object.entries(CAMPUS_STOPS).map(([stopId, stop]) => {
                const { x, y } = getCoordinates(stopId);
                const isHigh = stop.weight >= 1000;
                const isMed = stop.weight >= 500 && stop.weight < 1000;
                if (!isHigh && !isMed) return null;

                const radius = isHigh ? 55 : 35;
                return (
                  <circle
                    key={`heat-${stopId}`}
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={isHigh ? "url(#heat-high)" : "url(#heat-med)"}
                    className="pointer-events-none transition-all duration-700"
                  />
                );
              })}

            {/* Route Paths */}
            {routes.map((route, idx) => {
              const isSelected =
                selectedRouteIdx === null || selectedRouteIdx === idx;
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
              const pathD = generateRoutePath(route.path, idx);

              return (
                <g
                  key={`route-${idx}`}
                  className="transition-opacity duration-300"
                  opacity={isSelected ? 1 : 0.12}
                >
                  {/* Outer glow stroke when selected */}
                  {selectedRouteIdx === idx && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth="10"
                      strokeOpacity="0.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* Main Route Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color.stroke}
                    strokeWidth={selectedRouteIdx === idx ? 4 : 2.5}
                    strokeDasharray={selectedRouteIdx === idx ? "none" : "none"}
                    strokeOpacity={isSelected ? 0.9 : 0.2}
                    markerEnd={`url(#arrow-${idx % ROUTE_COLORS.length}-${title.replace(/\s+/g, "")})`}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* Stop Nodes */}
            {Object.entries(CAMPUS_STOPS).map(([stopId, stop]) => {
              const { x, y } = getCoordinates(stopId);
              const isHovered = hoveredStop === stopId;
              const isHighDemand = stop.weight >= 1000;

              // Check which routes pass through this stop
              const passingRoutes = routes
                .map((r, i) => (r.path.includes(stopId) ? i : -1))
                .filter((i) => i !== -1);
              const isStopServed = passingRoutes.length > 0;

              return (
                <g
                  key={`stop-${stopId}`}
                  transform={`translate(${x}, ${y})`}
                  onMouseEnter={() => setHoveredStop(stopId)}
                  onMouseLeave={() => setHoveredStop(null)}
                  className="cursor-pointer transition-transform duration-200"
                  style={{
                    transform: isHovered
                      ? `translate(${x}px, ${y}px) scale(1.15)`
                      : `translate(${x}px, ${y}px) scale(1)`,
                    transformOrigin: "center",
                  }}
                >
                  {/* Stop Circle Base */}
                  <circle
                    r={isHovered ? 12 : isHighDemand ? 9 : 7}
                    fill={isStopServed ? (isHighDemand ? "#ef4444" : "#3b82f6") : "#64748b"}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 3 : 2}
                    className="shadow-md transition-all duration-200"
                  />

                  {/* High demand pulse ring */}
                  {isHighDemand && (
                    <circle
                      r="14"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      opacity="0.6"
                      className="animate-ping"
                      style={{ animationDuration: "3s" }}
                    />
                  )}

                  {/* Stop Name Label */}
                  <text
                    y={y > svgHeight - 80 ? -14 : 19}
                    textAnchor="middle"
                    className={`text-[11px] font-semibold transition-all duration-200 select-none ${
                      isHovered
                        ? "fill-amber-300 font-bold text-[12px]"
                        : isHighDemand
                        ? "fill-red-300"
                        : "fill-slate-200"
                    }`}
                    style={{
                      textShadow: "0 2px 4px rgba(0,0,0,0.9)",
                    }}
                  >
                    {stop.nameTh}
                  </text>

                  {/* Demand weight badge */}
                  {showHeatmap && isHighDemand && (
                    <text
                      y={y > svgHeight - 80 ? -26 : 30}
                      textAnchor="middle"
                      className="fill-red-400 text-[9px] font-mono select-none"
                    >
                      🔥 {stop.weight} คน
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hovered Stop Detail Tooltip */}
        {hoveredStop && CAMPUS_STOPS[hoveredStop] && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-lg text-white shadow-xl flex flex-wrap items-center justify-between gap-2 z-20">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-amber-300">
                  🚏 {CAMPUS_STOPS[hoveredStop].nameTh} ({CAMPUS_STOPS[hoveredStop].nameEn})
                </span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  Demand: {CAMPUS_STOPS[hoveredStop].weight} คน
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {CAMPUS_STOPS[hoveredStop].desc}
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-slate-400 mr-1">สายที่ผ่าน:</span>
              {routes.map((r, i) => {
                if (!r.path.includes(hoveredStop)) return null;
                const col = ROUTE_COLORS[i % ROUTE_COLORS.length];
                return (
                  <span
                    key={i}
                    className="text-xs font-bold px-2 py-0.5 rounded text-white shadow-sm"
                    style={{ backgroundColor: col.stroke }}
                  >
                    R{i + 1}
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
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span>🗺️ Transit Network Graph (แผนภาพโครงข่ายเส้นทางรถเมล์)</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            เปรียบเทียบโครงข่ายเส้นทางเดินรถและจุดแวะจอดตามพิกัดจริงของ มธ. ศูนย์รังสิต
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
              showHeatmap
                ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            <span>🔥</span>
            <span>{showHeatmap ? "ซ่อน Demand Heatmap" : "แสดง Demand Heatmap"}</span>
          </button>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100">
            <button
              onClick={() => setViewMode("toggle")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === "toggle"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🔄 สลับมุมมอง (Toggle)
            </button>
            <button
              onClick={() => setViewMode("side-by-side")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === "side-by-side"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📊 เคียงข้าง (Side-by-Side)
            </button>
          </div>
        </div>
      </div>

      {/* Route Filter Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500 mr-1">เลือกดูสาย:</span>
        <button
          onClick={() => setSelectedRouteIdx(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            selectedRouteIdx === null
              ? "bg-slate-800 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          ทั้งหมด (All Routes)
        </button>
        {activeRoutes.map((route, idx) => {
          const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          const isSelected = selectedRouteIdx === idx;
          return (
            <button
              key={idx}
              onClick={() => setSelectedRouteIdx(isSelected ? null : idx)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition flex items-center space-x-1.5 ${
                isSelected
                  ? "text-white shadow-sm font-bold"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              style={{
                backgroundColor: isSelected ? col.stroke : undefined,
                borderColor: col.stroke,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isSelected ? "#fff" : col.stroke }}
              />
              <span>Route {idx + 1} ({route.num_bus} คัน)</span>
            </button>
          );
        })}
      </div>

      {/* Maps Rendering Area */}
      {viewMode === "toggle" ? (
        <div className="space-y-3">
          {/* Active Model Selector Buttons */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => setActiveToggle("baseline")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center space-x-2 ${
                activeToggle === "baseline"
                  ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>🚌 เส้นทาง Baseline (Fixed Routes)</span>
            </button>
            <span className="text-gray-400 font-bold">VS</span>
            <button
              onClick={() => setActiveToggle("optimized")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center space-x-2 ${
                activeToggle === "optimized"
                  ? "bg-purple-600 text-white shadow-md ring-2 ring-purple-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>✨ เส้นทางที่ปรับปรุง ({selectedMode.toUpperCase()})</span>
            </button>
          </div>

          {/* Single Main Map */}
          {activeToggle === "baseline"
            ? renderMapSvg(
                baselineSchedule,
                "Baseline Transit Network (โครงข่ายเส้นทางเดิม)",
                "blue"
              )
            : renderMapSvg(
                optimizedSchedule,
                `Optimized Transit Network (${selectedMode.toUpperCase()})`,
                "purple"
              )}
        </div>
      ) : (
        /* Side by Side View */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            {renderMapSvg(
              baselineSchedule,
              "1️⃣ Baseline (Fixed Routes)",
              "blue",
              true
            )}
            <div className="mt-2 text-xs text-gray-500 text-center">
              เส้นทางเดิมวนรอบใหญ่ ความถี่ไม่สอดคล้องกับจุดผู้โดยสารหนาแน่น
            </div>
          </div>
          <div>
            {renderMapSvg(
              optimizedSchedule,
              `2️⃣ Optimized (${selectedMode.toUpperCase()})`,
              "purple",
              true
            )}
            <div className="mt-2 text-xs text-purple-700 font-medium text-center">
              เส้นทางที่ปรับโดย {selectedMode.toUpperCase()} เชื่อมต่อกลุ่มหอพักและอาคารเรียนรวมได้ตรงจุด
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="bg-slate-50 p-4 rounded-lg border text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700">สัญลักษณ์บนแผนภาพ:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span>ป้ายหนาแน่นสูง (Demand &gt; 1,000 คน เช่น หอพัก, บร., สังคมศาสตร์)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span>ป้ายทั่วไป</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-6 h-0.5 bg-blue-500 inline-block" />
            <span>เส้นทางเดินรถและลูกศรชี้ทิศทาง</span>
          </div>
        </div>
        <div className="text-slate-400 italic">
          * คลิกหรือชี้ที่ป้ายรถเมล์เพื่อดูข้อมูลสายที่ผ่านและระดับความต้องการ
        </div>
      </div>
    </div>
  );
}
