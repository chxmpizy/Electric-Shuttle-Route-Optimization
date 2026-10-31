"use client";

import L from "leaflet";
import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Tooltip,
  Popup,
} from "react-leaflet";
import { CAMPUS_STOPS, ROUTE_COLORS, RouteSchedule } from "@/types/shuttle";

interface LiveMapGeoProps {
  schedule: RouteSchedule[];
  mode: string;
  tNowMinutes: number;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string | null) => void;
}

interface BusMarker {
  routeIdx: number;
  busIdx: number;
  lat: number;
  lng: number;
  angleDeg: number;
  nextStopId: string;
  etaToNextMinutes: number;
}

const CAMPUS_CENTER: [number, number] = [14.0715, 100.605];
const DEFAULT_ZOOM = 16;
const OSRM_BASE = "https://router.project-osrm.org";

/* ──────────────────────────────────────────────────────────
   Tile styles — all free, no API key
   ────────────────────────────────────────────────────────── */

type TileStyle = "satellite" | "street" | "light";

interface TileConfig {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  overlayUrl?: string;
  overlayAttribution?: string;
}

const TILE_CONFIGS: Record<TileStyle, TileConfig> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
    overlayUrl:
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    overlayAttribution:
      "Labels &copy; <a href='https://www.openstreetmap.org/copyright'>OSM</a> &copy; CARTO",
  },
  street: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    subdomains: ["a", "b", "c", "d"],
  },
};

const TILE_LABELS: Array<{ key: TileStyle; label: string }> = [
  { key: "satellite", label: "ดาวเทียม" },
  { key: "street", label: "แผนที่ถนน" },
  { key: "light", label: "เรียบ" },
];

/* ──────────────────────────────────────────────────────────
   OSRM routing — persists across remounts
   ────────────────────────────────────────────────────────── */

interface SegmentData {
  polyline: [number, number][];
  cumDist: number[];
  totalDist: number;
}

const SEGMENT_CACHE = new Map<string, SegmentData>();
const SNAPPED_STOP_CACHE = new Map<string, [number, number]>();

// Flat-earth distance (OK at TU scale ~1km)
function flatDist(a: [number, number], b: [number, number]): number {
  const dLat = b[0] - a[0];
  const dLng = (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function buildSegmentData(polyline: [number, number][]): SegmentData {
  const cumDist: number[] = [0];
  let total = 0;
  for (let i = 1; i < polyline.length; i++) {
    total += flatDist(polyline[i - 1], polyline[i]);
    cumDist.push(total);
  }
  return { polyline, cumDist, totalDist: total };
}

function interpAlongSegment(
  seg: SegmentData,
  frac: number
): { lat: number; lng: number; angleDeg: number } | null {
  const { polyline, cumDist, totalDist } = seg;
  if (polyline.length < 2 || totalDist <= 0) {
    const p = polyline[0];
    return p ? { lat: p[0], lng: p[1], angleDeg: 0 } : null;
  }
  const target = Math.max(0, Math.min(1, frac)) * totalDist;
  // Walk to find local segment
  let i = 1;
  while (i < cumDist.length && cumDist[i] < target) i++;
  if (i >= cumDist.length) i = cumDist.length - 1;
  const segStart = cumDist[i - 1];
  const segEnd = cumDist[i];
  const segLen = segEnd - segStart;
  const segFrac = segLen > 0 ? (target - segStart) / segLen : 0;
  const [lat1, lng1] = polyline[i - 1];
  const [lat2, lng2] = polyline[i];
  const lat = lat1 + (lat2 - lat1) * segFrac;
  const lng = lng1 + (lng2 - lng1) * segFrac;
  // Heading: CSS deg (0=east, -90=up/north)
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const angleDeg = (Math.atan2(-dLat, dLng) * 180) / Math.PI;
  return { lat, lng, angleDeg };
}

async function fetchSegmentPolyline(
  stopA: string,
  stopB: string
): Promise<SegmentData> {
  const key = `${stopA}>${stopB}`;
  const cached = SEGMENT_CACHE.get(key);
  if (cached) return cached;

  const a = CAMPUS_STOPS[stopA];
  const b = CAMPUS_STOPS[stopB];
  const fallbackPoly: [number, number][] =
    a && b ? [[a.lat, a.lon], [b.lat, b.lon]] : [];
  const buildFallback = () => buildSegmentData(fallbackPoly);

  if (!a || !b) {
    const empty = buildFallback();
    SEGMENT_CACHE.set(key, empty);
    return empty;
  }

  try {
    const snapA = SNAPPED_STOP_CACHE.get(stopA) ?? [a.lat, a.lon];
    const snapB = SNAPPED_STOP_CACHE.get(stopB) ?? [b.lat, b.lon];
    const url = `${OSRM_BASE}/route/v1/driving/${snapA[1]},${snapA[0]};${snapB[1]},${snapB[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM http " + res.status);
    const data = await res.json();
    const coords: [number, number][] | undefined =
      data?.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) throw new Error("Empty route");
    const polyline: [number, number][] = coords.map(
      ([lon, lat]) => [lat, lon] as [number, number]
    );
    const seg = buildSegmentData(polyline);
    SEGMENT_CACHE.set(key, seg);
    return seg;
  } catch {
    const seg = buildFallback();
    SEGMENT_CACHE.set(key, seg);
    return seg;
  }
}

async function fetchSnappedStop(
  stopId: string
): Promise<[number, number]> {
  const cached = SNAPPED_STOP_CACHE.get(stopId);
  if (cached) return cached;
  const s = CAMPUS_STOPS[stopId];
  if (!s) return [0, 0];
  const fallback: [number, number] = [s.lat, s.lon];
  try {
    const url = `${OSRM_BASE}/nearest/v1/driving/${s.lon},${s.lat}?number=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM nearest http " + res.status);
    const data = await res.json();
    const w = data?.waypoints?.[0];
    if (!w?.location || w.location.length !== 2) throw new Error("No location");
    const [lon, lat] = w.location as [number, number];
    // Reject huge snaps (>120m) — likely wrong road
    const dist = flatDist([s.lat, s.lon], [lat, lon]);
    if (dist > 0.0012) {
      SNAPPED_STOP_CACHE.set(stopId, fallback);
      return fallback;
    }
    const snapped: [number, number] = [lat, lon];
    SNAPPED_STOP_CACHE.set(stopId, snapped);
    return snapped;
  } catch {
    SNAPPED_STOP_CACHE.set(stopId, fallback);
    return fallback;
  }
}

/* ──────────────────────────────────────────────────────────
   Schedule helpers
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

function makeBusIcon(
  routeIdx: number,
  angleDeg: number,
  color: string,
  approaching: boolean
): L.DivIcon {
  const html = `
    <div class="bus-pill ${approaching ? "approaching" : ""}"
         style="--bus-color: ${color}; transform: rotate(${angleDeg}deg);">
      <span class="bus-pill-inner" style="transform: rotate(${-angleDeg}deg);">
        ${routeIdx + 1}
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "live-bus-marker",
    iconSize: [28, 20],
    iconAnchor: [14, 10],
  });
}

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

export default function LiveMapGeo({
  schedule,
  mode,
  tNowMinutes,
  selectedStopId,
  onSelectStop,
}: LiveMapGeoProps) {
  const [visibleRoutes, setVisibleRoutes] = useState<Set<number>>(
    () => new Set(schedule.map((_, i) => i))
  );
  const [tileStyle, setTileStyle] = useState<TileStyle>("satellite");
  const tile = TILE_CONFIGS[tileStyle];
  const isSatellite = tileStyle === "satellite";

  // Snapped stops (pulled onto the nearest actual road)
  const [snappedStops, setSnappedStops] = useState<
    Map<string, [number, number]>
  >(() => new Map(SNAPPED_STOP_CACHE));
  // Road-following polylines keyed as "stopA>stopB"
  const [segments, setSegments] = useState<Map<string, SegmentData>>(
    () => new Map(SEGMENT_CACHE)
  );
  const [routingStatus, setRoutingStatus] = useState<
    "idle" | "loading" | "ready" | "fallback"
  >("idle");

  // Fetch snapped stops + routed polylines once per schedule
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // Collect stops + pairs
      const neededStops = new Set<string>();
      const neededPairs: Array<[string, string]> = [];
      const seenPair = new Set<string>();
      for (const route of schedule) {
        for (let i = 0; i < route.path.length; i++) {
          neededStops.add(route.path[i]);
          if (i < route.path.length - 1) {
            const key = `${route.path[i]}>${route.path[i + 1]}`;
            if (!seenPair.has(key)) {
              seenPair.add(key);
              neededPairs.push([route.path[i], route.path[i + 1]]);
            }
          }
        }
      }

      const allCached =
        [...neededStops].every((id) => SNAPPED_STOP_CACHE.has(id)) &&
        neededPairs.every(([a, b]) => SEGMENT_CACHE.has(`${a}>${b}`));
      if (allCached) {
        setRoutingStatus("ready");
        return;
      }

      setRoutingStatus("loading");

      // 1) Snap stops to nearest road
      const stopResults = await Promise.all(
        [...neededStops].map(async (id) => ({
          id,
          snap: await fetchSnappedStop(id),
        }))
      );
      if (cancelled) return;
      const stopMap = new Map(SNAPPED_STOP_CACHE);
      for (const r of stopResults) stopMap.set(r.id, r.snap);
      setSnappedStops(stopMap);

      // 2) Fetch routed polyline per unique pair (uses snapped coords inside)
      const pairResults = await Promise.all(
        neededPairs.map(async ([a, b]) => ({
          key: `${a}>${b}`,
          seg: await fetchSegmentPolyline(a, b),
        }))
      );
      if (cancelled) return;
      const segMap = new Map(SEGMENT_CACHE);
      let hadRealRoute = false;
      for (const r of pairResults) {
        segMap.set(r.key, r.seg);
        if (r.seg.polyline.length > 2) hadRealRoute = true;
      }
      setSegments(segMap);
      setRoutingStatus(hadRealRoute ? "ready" : "fallback");
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [schedule]);

  // Helper to fetch snapped position (fallback to raw stop coord)
  const getStopPos = (stopId: string): [number, number] => {
    const s = snappedStops.get(stopId);
    if (s) return s;
    const raw = CAMPUS_STOPS[stopId];
    return raw ? [raw.lat, raw.lon] : [0, 0];
  };

  const getSegment = (a: string, b: string): SegmentData => {
    const key = `${a}>${b}`;
    const cached = segments.get(key);
    if (cached) return cached;
    // Fallback: straight line between snapped stops (or raw)
    const p = [getStopPos(a), getStopPos(b)];
    return buildSegmentData(p);
  };

  /* ─── Bus marker positions (follow road polyline) ─── */
  const busMarkers = useMemo<BusMarker[]>(() => {
    const markers: BusMarker[] = [];
    schedule.forEach((route, routeIdx) => {
      if (!visibleRoutes.has(routeIdx)) return;
      if (route.path.length < 2) return;

      const segmentDurations = computeSegmentDurations(route);

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
            const segData = getSegment(route.path[seg], route.path[seg + 1]);
            const point = interpAlongSegment(segData, frac);
            if (point) {
              markers.push({
                routeIdx,
                busIdx,
                lat: point.lat,
                lng: point.lng,
                angleDeg: point.angleDeg,
                nextStopId: route.path[seg + 1],
                etaToNextMinutes: Math.max(0, (1 - frac) * segDur),
              });
            }
            break;
          }
          cumulative += segDur;
        }
      }
    });
    return markers;
    // segments is a dep so markers refresh when polylines arrive
  }, [schedule, tNowMinutes, visibleRoutes, segments, snappedStops]);

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
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
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
              แผนที่ TU Rangsit · จำลองจากตาราง {mode.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <RoutingStatusChip status={routingStatus} />
          <div className="inline-flex p-0.5 bg-neutral-100 rounded-lg">
            {TILE_LABELS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTileStyle(t.key)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition ${
                  tileStyle === t.key
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-neutral-500 tabular-nums">
            {busMarkers.length} / {totalBuses} คัน
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
        {/* Sidebar */}
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

          <div className="space-y-1.5 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
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
                    <span>{visible ? "แสดง" : "ซ่อน"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Map */}
        <div className="relative h-[460px] md:h-[520px]">
          <MapContainer
            center={CAMPUS_CENTER}
            zoom={DEFAULT_ZOOM}
            minZoom={14}
            maxZoom={tile.maxZoom}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              key={`base-${tileStyle}`}
              url={tile.url}
              attribution={tile.attribution}
              maxZoom={tile.maxZoom}
              subdomains={tile.subdomains ?? ["a", "b", "c"]}
            />
            {tile.overlayUrl && (
              <TileLayer
                key={`overlay-${tileStyle}`}
                url={tile.overlayUrl}
                attribution={tile.overlayAttribution ?? ""}
                maxZoom={tile.maxZoom}
                opacity={0.9}
                subdomains={["a", "b", "c", "d"]}
              />
            )}

            {/* Route polylines — road-following via OSRM, fallback to straight */}
            {schedule.map((route, idx) => {
              if (!visibleRoutes.has(idx)) return null;
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
              const servesSelected = selectedStopId
                ? route.path.includes(selectedStopId)
                : true;

              // Concatenate per-segment polylines
              const combined: [number, number][] = [];
              for (let i = 0; i < route.path.length - 1; i++) {
                const seg = getSegment(route.path[i], route.path[i + 1]);
                if (seg.polyline.length === 0) continue;
                if (combined.length === 0) combined.push(...seg.polyline);
                else combined.push(...seg.polyline.slice(1));
              }
              if (combined.length < 2) return null;

              return (
                <React.Fragment key={`route-${idx}-${segments.size}`}>
                  <Polyline
                    positions={combined}
                    pathOptions={{
                      color: color.stroke,
                      weight: 10,
                      opacity: servesSelected
                        ? isSatellite
                          ? 0.22
                          : 0.14
                        : 0.05,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                  <Polyline
                    positions={combined}
                    pathOptions={{
                      color: color.stroke,
                      weight: isSatellite ? 4 : 3.5,
                      opacity: servesSelected ? 0.95 : 0.3,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                </React.Fragment>
              );
            })}

            {/* Stop markers at snapped (road-aligned) positions */}
            {Object.entries(CAMPUS_STOPS).map(([stopId, stop]) => {
              const isSelected = selectedStopId === stopId;
              const isHigh = stop.weight >= 1000;
              const pos = getStopPos(stopId);
              const borderColor = isSelected
                ? "#4f46e5"
                : isHigh
                ? "#f59e0b"
                : isSatellite
                ? "#ffffff"
                : "#525252";
              const fillColor = isSelected
                ? "#eef2ff"
                : isHigh
                ? "#fef3c7"
                : "#ffffff";

              return (
                <CircleMarker
                  key={stopId}
                  center={pos}
                  radius={isSelected ? 9 : isHigh ? 7 : 5.5}
                  pathOptions={{
                    color: borderColor,
                    fillColor,
                    weight: isSelected ? 2.5 : isSatellite ? 2.5 : 2,
                    fillOpacity: 1,
                  }}
                  eventHandlers={{
                    click: () =>
                      onSelectStop?.(isSelected ? null : stopId),
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -8]}
                    opacity={1}
                    permanent={isSelected}
                    className="stop-tooltip"
                  >
                    <span className="font-medium">{stop.nameTh}</span>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Bus markers */}
            {busMarkers.map((bus) => {
              const key = `bus-${bus.routeIdx}-${bus.busIdx}`;
              const color = ROUTE_COLORS[bus.routeIdx % ROUTE_COLORS.length];
              const approaching =
                selectedStopId === bus.nextStopId &&
                bus.etaToNextMinutes < 1;
              return (
                <Marker
                  key={key}
                  position={[bus.lat, bus.lng]}
                  icon={makeBusIcon(
                    bus.routeIdx,
                    bus.angleDeg,
                    color.stroke,
                    !!approaching
                  )}
                  zIndexOffset={1000}
                >
                  <Popup closeButton={false}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-5 h-5 rounded-md inline-flex items-center justify-center text-[11px] font-semibold text-white"
                          style={{ backgroundColor: color.stroke }}
                        >
                          {bus.routeIdx + 1}
                        </span>
                        <span className="font-semibold text-neutral-900">
                          รถสาย {bus.routeIdx + 1} · คันที่ {bus.busIdx + 1}
                        </span>
                      </div>
                      <div className="text-neutral-600">
                        กำลังมุ่งหน้าสู่{" "}
                        <span className="font-medium text-neutral-900">
                          {CAMPUS_STOPS[bus.nextStopId]?.nameTh ??
                            bus.nextStopId}
                        </span>
                      </div>
                      <div className="text-neutral-500 tabular-nums">
                        อีก {bus.etaToNextMinutes.toFixed(1)} นาที
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-neutral-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-500">
        <span className="font-medium text-neutral-500">คำอธิบาย</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-white border border-neutral-500" />
          ป้ายทั่วไป
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-100 border border-amber-500" />
          ป้ายหนาแน่น
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-full bg-neutral-900 border border-white shadow-sm" />
          รถกำลังวิ่ง
        </span>
        <span className="text-neutral-400 ml-auto">
          คลิกป้ายเพื่อโฟกัส · คลิกรถเพื่อดู ETA
        </span>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   Small subcomponents
   ────────────────────────────────────────────────────────── */

function RoutingStatusChip({
  status,
}: {
  status: "idle" | "loading" | "ready" | "fallback";
}) {
  if (status === "idle") return null;
  const config = {
    loading: {
      dot: "bg-amber-500 animate-pulse",
      text: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      label: "กำลังปรับเส้นทางตามถนน…",
    },
    ready: {
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
      label: "เส้นทางตามถนนจริง",
    },
    fallback: {
      dot: "bg-neutral-400",
      text: "text-neutral-600",
      bg: "bg-neutral-50 border-neutral-200",
      label: "ใช้เส้นตรง (OSRM ไม่พร้อม)",
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
