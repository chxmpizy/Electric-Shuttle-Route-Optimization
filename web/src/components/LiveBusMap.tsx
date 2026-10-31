"use client";

import React, { useMemo, useState } from "react";
import { CAMPUS_STOPS, ROUTE_COLORS, RouteSchedule } from "@/types/shuttle";

interface LiveBusMapProps {
  schedule: RouteSchedule[];
  mode: string;
  tNowMinutes: number;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string | null) => void;
}

interface BusMarker {
  routeIdx: number;
  busIdx: number;
  x: number;
  y: number;
  angleDeg: number;
  nextStopId: string;
  etaToNextMinutes: number;
}

/* ──────────────────────────────────────────────────────────
   Public: compute next-arrivals per route for a given stop
   ────────────────────────────────────────────────────────── */

export function computeNextArrivals(
  schedule: RouteSchedule[],
  stopId: string,
  tNowMinutes: number,
  horizonMinutes: number = 60
): Array<{
  routeIdx: number;
  routeLabel: string;
  etaMinutes: number;
  arrivalMinutes: number;
}> {
  const out: Array<{
    routeIdx: number;
    routeLabel: string;
    etaMinutes: number;
    arrivalMinutes: number;
  }> = [];

  schedule.forEach((route, routeIdx) => {
    const stopIndex = route.path.indexOf(stopId);
    if (stopIndex < 0) return;

    const segmentDurations = computeSegmentDurations(route);
    let offsetFromStart = 0;
    for (let i = 0; i < stopIndex; i++) offsetFromStart += segmentDurations[i];

    for (let busIdx = 0; busIdx < route.num_bus; busIdx++) {
      const busStart = route.startTime + busIdx * route.headway;
      for (let k = 0; k < 50; k++) {
        const arrival = busStart + k * route.cycle_time + offsetFromStart;
        if (arrival > route.endTime + route.cycle_time) break;
        if (arrival >= tNowMinutes - 0.1) {
          const eta = arrival - tNowMinutes;
          if (eta <= horizonMinutes) {
            out.push({
              routeIdx,
              routeLabel: `สาย ${routeIdx + 1}`,
              etaMinutes: eta,
              arrivalMinutes: arrival,
            });
          }
          break;
        }
      }
    }
  });

  const nearestPerRoute = new Map<number, (typeof out)[number]>();
  out
    .sort((a, b) => a.etaMinutes - b.etaMinutes)
    .forEach((entry) => {
      if (!nearestPerRoute.has(entry.routeIdx)) {
        nearestPerRoute.set(entry.routeIdx, entry);
      }
    });
  return Array.from(nearestPerRoute.values()).sort(
    (a, b) => a.etaMinutes - b.etaMinutes
  );
}

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */

function computeSegmentDurations(route: RouteSchedule): number[] {
  const n = route.path.length - 1;
  if (n <= 0) return [];

  if (route.timetable && route.timetable.length === route.path.length) {
    const durs: number[] = [];
    for (let i = 1; i < route.timetable.length; i++) {
      const d =
        route.timetable[i].arrival_time - route.timetable[i - 1].arrival_time;
      durs.push(Math.max(0.1, d));
    }
    return durs;
  }
  const even = route.cycle_time / n;
  return Array(n).fill(even);
}

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

export default function LiveBusMap({
  schedule,
  mode,
  tNowMinutes,
  selectedStopId,
  onSelectStop,
}: LiveBusMapProps) {
  const [hoveredStop, setHoveredStop] = useState<string | null>(null);
  const [hoveredBus, setHoveredBus] = useState<string | null>(null);
  const [visibleRoutes, setVisibleRoutes] = useState<Set<number>>(
    () => new Set(schedule.map((_, i) => i))
  );

  const svgWidth = 860;
  const svgHeight = 520;
  const padding = 60;

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

  // Straight-line path with slight offset per route to prevent overlap
  const generateRoutePath = (path: string[], routeIdx: number) => {
    if (path.length < 2) return "";
    const offset = (routeIdx - 2.5) * 4;
    const points = path.map((stop) => getCoordinates(stop));
    let d = "";
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (i === 0) d += `M ${(pt.x + offset).toFixed(2)} ${(pt.y + offset).toFixed(2)}`;
      else d += ` L ${(pt.x + offset).toFixed(2)} ${(pt.y + offset).toFixed(2)}`;
    }
    return d;
  };

  /* ─── Compute bus markers w/ heading angle ─── */

  const busMarkers = useMemo<BusMarker[]>(() => {
    const markers: BusMarker[] = [];

    schedule.forEach((route, routeIdx) => {
      if (!visibleRoutes.has(routeIdx)) return;
      if (route.path.length < 2) return;

      const segmentDurations = computeSegmentDurations(route);
      const offset = (routeIdx - 2.5) * 4;

      for (let busIdx = 0; busIdx < route.num_bus; busIdx++) {
        const busStart = route.startTime + busIdx * route.headway;
        if (tNowMinutes < busStart) continue;
        if (tNowMinutes > route.endTime) continue;

        const elapsed = tNowMinutes - busStart;
        const cycleT = elapsed % route.cycle_time;

        let cumulative = 0;
        for (let seg = 0; seg < segmentDurations.length; seg++) {
          const segDur = segmentDurations[seg];
          if (cycleT < cumulative + segDur) {
            const frac = (cycleT - cumulative) / segDur;
            const from = getCoordinates(route.path[seg]);
            const to = getCoordinates(route.path[seg + 1]);
            const x = from.x + (to.x - from.x) * frac + offset;
            const y = from.y + (to.y - from.y) * frac + offset;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

            markers.push({
              routeIdx,
              busIdx,
              x,
              y,
              angleDeg,
              nextStopId: route.path[seg + 1],
              etaToNextMinutes: Math.max(0, (1 - frac) * segDur),
            });
            break;
          }
          cumulative += segDur;
        }
      }
    });

    return markers;
  }, [schedule, tNowMinutes, visibleRoutes]);

  const totalBuses = schedule.reduce((s, r) => s + (r.num_bus || 0), 0);

  const toggleRoute = (idx: number) => {
    const next = new Set(visibleRoutes);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setVisibleRoutes(next);
  };

  const showAll = () => setVisibleRoutes(new Set(schedule.map((_, i) => i)));

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex w-2.5 h-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-70 animate-ping" />
            <span className="relative inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </span>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-neutral-900">
              แผนที่รถเมล์ Real-time
            </div>
            <div className="text-[11px] text-neutral-500">
              จำลองจากตาราง {mode.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-neutral-500 tabular-nums">
          {busMarkers.length} / {totalBuses} คันกำลังวิ่ง
        </div>
      </div>

      {/* Main area: side panel + map */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
        {/* ─── Route overview sidebar ─── */}
        <aside className="p-4 bg-neutral-50/40 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Active Routes
            </div>
            <button
              onClick={showAll}
              className="text-[10px] text-neutral-500 hover:text-neutral-900 transition"
            >
              แสดงทั้งหมด
            </button>
          </div>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
            {schedule.map((route, idx) => {
              const col = ROUTE_COLORS[idx % ROUTE_COLORS.length];
              const activeOnThis = busMarkers.filter(
                (b) => b.routeIdx === idx
              ).length;
              const visible = visibleRoutes.has(idx);
              const utilPct = route.num_bus
                ? Math.round((activeOnThis / route.num_bus) * 100)
                : 0;

              return (
                <button
                  key={idx}
                  onClick={() => toggleRoute(idx)}
                  className={`w-full text-left rounded-lg border transition p-2.5 ${
                    visible
                      ? "bg-white border-neutral-200 hover:border-neutral-300"
                      : "bg-neutral-100/60 border-neutral-200 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-[11px] font-semibold shrink-0"
                        style={{ backgroundColor: col.stroke }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-[12px] font-medium text-neutral-900">
                        สาย {idx + 1}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 tabular-nums">
                      {activeOnThis}/{route.num_bus}
                    </span>
                  </div>

                  {/* Utilization bar */}
                  <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${utilPct}%`,
                        backgroundColor: col.stroke,
                      }}
                    />
                  </div>

                  <div className="text-[10px] text-neutral-500 mt-1.5 tabular-nums flex items-center justify-between">
                    <span>ปล่อยทุก {route.headway.toFixed(1)} น.</span>
                    <span
                      className={
                        visible ? "text-neutral-400" : "text-neutral-500"
                      }
                    >
                      {visible ? "แสดง" : "ซ่อน"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ─── Map ─── */}
        <div className="relative bg-neutral-50 overflow-hidden">
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[500px] select-none"
              style={{ minWidth: "560px" }}
            >
              <defs>
                <pattern
                  id="light-grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#e5e5e5"
                    strokeWidth="0.6"
                  />
                </pattern>
              </defs>

              <rect width={svgWidth} height={svgHeight} fill="url(#light-grid)" />

              {/* Routes */}
              {schedule.map((route, idx) => {
                if (!visibleRoutes.has(idx)) return null;
                const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
                const d = generateRoutePath(route.path, idx);
                // Dim routes that don't serve the selected stop
                const servesSelected = selectedStopId
                  ? route.path.includes(selectedStopId)
                  : true;
                const mainOpacity = servesSelected ? 0.78 : 0.18;
                const glowOpacity = servesSelected ? 0.1 : 0.03;
                return (
                  <g
                    key={`route-${idx}`}
                    style={{ transition: "opacity 0.3s ease" }}
                  >
                    {/* Soft underglow */}
                    <path
                      d={d}
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth="8"
                      strokeOpacity={glowOpacity}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Main line */}
                    <path
                      d={d}
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth="2.5"
                      strokeOpacity={mainOpacity}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}

              {/* Stop nodes (rounded squares like fleet dashboard) */}
              {Object.entries(CAMPUS_STOPS).map(([stopId, stop], stopIdx) => {
                const { x, y } = getCoordinates(stopId);
                const isHovered = hoveredStop === stopId;
                const isSelected = selectedStopId === stopId;
                const isHigh = stop.weight >= 1000;

                // Which routes serve this stop? For color coding
                const servingRoutes = schedule
                  .map((r, i) => (r.path.includes(stopId) ? i : -1))
                  .filter((i) => i >= 0 && visibleRoutes.has(i));

                const nodeW = isHovered || isSelected ? 24 : isHigh ? 22 : 18;
                const nodeH = isHovered || isSelected ? 20 : isHigh ? 18 : 16;
                const stroke = isSelected
                  ? "#4f46e5"
                  : isHigh
                  ? "#f59e0b"
                  : "#737373";
                const fill = isSelected
                  ? "#eef2ff"
                  : isHigh
                  ? "#fef3c7"
                  : "#ffffff";
                const strokeW = isSelected || isHovered ? 2 : 1.5;
                const labelY = y > svgHeight - 60 ? -nodeH / 2 - 8 : nodeH / 2 + 14;
                const letter = String.fromCharCode(65 + (stopIdx % 26));

                return (
                  <g
                    key={`stop-${stopId}`}
                    onMouseEnter={() => setHoveredStop(stopId)}
                    onMouseLeave={() => setHoveredStop(null)}
                    onClick={() => onSelectStop?.(isSelected ? null : stopId)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x - nodeW / 2}
                      y={y - nodeH / 2}
                      width={nodeW}
                      height={nodeH}
                      rx={4}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeW}
                    />
                    {/* Letter inside node */}
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill={isSelected ? "#4f46e5" : "#404040"}
                      pointerEvents="none"
                    >
                      {letter}
                    </text>

                    {/* Serving-routes color stripe below */}
                    {servingRoutes.length > 0 && (
                      <g pointerEvents="none">
                        {servingRoutes.map((rIdx, i) => {
                          const col = ROUTE_COLORS[rIdx % ROUTE_COLORS.length];
                          const stripW = Math.min(
                            nodeW / Math.max(1, servingRoutes.length),
                            6
                          );
                          const stripX =
                            x -
                            (servingRoutes.length * stripW) / 2 +
                            i * stripW;
                          return (
                            <rect
                              key={i}
                              x={stripX}
                              y={y + nodeH / 2 + 2}
                              width={stripW - 1}
                              height={2}
                              rx={1}
                              fill={col.stroke}
                            />
                          );
                        })}
                      </g>
                    )}

                    {/* Stop name label */}
                    <text
                      x={x}
                      y={y + labelY}
                      textAnchor="middle"
                      fontSize={isHovered || isSelected ? "11" : "10"}
                      fontWeight={isHovered || isSelected ? "600" : "500"}
                      fill={
                        isSelected
                          ? "#4f46e5"
                          : isHovered
                          ? "#171717"
                          : "#525252"
                      }
                      pointerEvents="none"
                    >
                      {stop.nameTh}
                    </text>
                  </g>
                );
              })}

              {/* Bus markers (pill-shaped with heading) */}
              {busMarkers.map((bus) => {
                const key = `bus-${bus.routeIdx}-${bus.busIdx}`;
                const color = ROUTE_COLORS[bus.routeIdx % ROUTE_COLORS.length];
                const isHovered = hoveredBus === key;
                const servesSelected = selectedStopId
                  ? schedule[bus.routeIdx]?.path.includes(selectedStopId)
                  : true;
                const dimmed = selectedStopId && !servesSelected;
                const pw = isHovered ? 24 : 20;
                const ph = isHovered ? 14 : 12;
                // Approaching selected stop? Highlight extra
                const approaching =
                  servesSelected &&
                  selectedStopId === bus.nextStopId &&
                  bus.etaToNextMinutes < 1;

                return (
                  <g
                    key={key}
                    style={{
                      transform: `translate(${bus.x}px, ${bus.y}px) rotate(${bus.angleDeg}deg)`,
                      transition: "transform 0.9s linear, opacity 0.3s ease",
                      transformBox: "fill-box",
                      opacity: dimmed ? 0.22 : 1,
                    }}
                    onMouseEnter={() => setHoveredBus(key)}
                    onMouseLeave={() => setHoveredBus(null)}
                    className="cursor-pointer"
                  >
                    {/* Approaching: large pulsing ring */}
                    {approaching && (
                      <circle
                        r={pw / 2 + 8}
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth="2"
                        opacity="0.6"
                        className="animate-ping"
                        style={{ animationDuration: "1.4s" }}
                      />
                    )}
                    {/* Soft breathing glow */}
                    <ellipse
                      rx={pw / 2 + 4}
                      ry={ph / 2 + 2}
                      fill={color.stroke}
                      opacity={isHovered ? 0.28 : approaching ? 0.3 : 0.16}
                    />
                    {/* Shadow */}
                    <rect
                      x={-pw / 2}
                      y={-ph / 2 + 0.5}
                      width={pw}
                      height={ph}
                      rx={ph / 2}
                      fill="rgba(0,0,0,0.15)"
                    />
                    {/* Bus body */}
                    <rect
                      x={-pw / 2}
                      y={-ph / 2}
                      width={pw}
                      height={ph}
                      rx={ph / 2}
                      fill={color.stroke}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {/* Direction arrow tip */}
                    <path
                      d={`M ${pw / 2 - 3} 0 L ${pw / 2 + 2} 0`}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    {/* Route number — counter-rotate so text stays upright */}
                    <g style={{ transform: `rotate(${-bus.angleDeg}deg)` }}>
                      <text
                        y={isHovered ? 3 : 2.5}
                        textAnchor="middle"
                        fontSize={isHovered ? "10" : "9"}
                        fontWeight="700"
                        fill="#ffffff"
                        pointerEvents="none"
                      >
                        {bus.routeIdx + 1}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Hover tooltip (bus) */}
          {hoveredBus &&
            (() => {
              const [, rIdx, bIdx] = hoveredBus.split("-");
              const bus = busMarkers.find(
                (b) => b.routeIdx === Number(rIdx) && b.busIdx === Number(bIdx)
              );
              if (!bus) return null;
              const color = ROUTE_COLORS[bus.routeIdx % ROUTE_COLORS.length];
              return (
                <div className="absolute bottom-3 left-3 right-3 md:right-auto md:max-w-xs bg-white border border-neutral-200 shadow-lg px-4 py-3 rounded-lg z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-5 h-5 rounded-md inline-flex items-center justify-center text-[11px] font-semibold text-white"
                      style={{ backgroundColor: color.stroke }}
                    >
                      {bus.routeIdx + 1}
                    </span>
                    <span className="text-[13px] font-semibold text-neutral-900">
                      รถสาย {bus.routeIdx + 1} · คันที่ {bus.busIdx + 1}
                    </span>
                  </div>
                  <div className="text-[12px] text-neutral-600">
                    กำลังมุ่งหน้าสู่{" "}
                    <span className="font-medium text-neutral-900">
                      {CAMPUS_STOPS[bus.nextStopId]?.nameTh ?? bus.nextStopId}
                    </span>
                    <span className="text-neutral-400">
                      {" "}
                      · อีก {bus.etaToNextMinutes.toFixed(1)} นาที
                    </span>
                  </div>
                </div>
              );
            })()}

          {/* Hover tooltip (stop) */}
          {hoveredStop && !hoveredBus && CAMPUS_STOPS[hoveredStop] && (
            <div className="absolute top-3 right-3 bg-white border border-neutral-200 shadow-md px-3 py-2 rounded-lg text-[12px] z-10">
              <div className="font-semibold text-neutral-900">
                {CAMPUS_STOPS[hoveredStop].nameTh}
              </div>
              <div className="text-[11px] text-neutral-500">
                {CAMPUS_STOPS[hoveredStop].nameEn}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-neutral-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-500">
        <span className="font-medium text-neutral-500">คำอธิบาย</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm bg-white border border-neutral-400" />
          ป้ายทั่วไป
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm bg-amber-50 border border-amber-500" />
          ป้ายหนาแน่น
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-5 h-2.5 rounded-full bg-neutral-900" />
          รถกำลังวิ่ง
        </span>
        <span className="text-neutral-400 ml-auto">
          คลิกการ์ดสายเพื่อซ่อน/แสดง · คลิกป้ายเพื่อดู ETA
        </span>
      </div>
    </section>
  );
}
