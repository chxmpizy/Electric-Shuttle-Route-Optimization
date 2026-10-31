"use client";

import React, { useMemo, useState } from "react";
import { CAMPUS_STOPS, RouteSchedule, ROUTE_COLORS } from "@/types/shuttle";
import { computeNextArrivals } from "@/components/LiveBusMap";

interface LiveETAPanelProps {
  schedule: RouteSchedule[];
  tNowMinutes: number;
  selectedStop: string | null;
  onSelectStop: (id: string | null) => void;
}

const DEFAULT_STOP = "Dorm";

const formatMinSec = (minutes: number) => {
  if (minutes < 0) return { mm: "0", ss: "00", total: 0 };
  const totalSec = Math.max(0, Math.round(minutes * 60));
  const mm = Math.floor(totalSec / 60).toString();
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return { mm, ss, total: totalSec };
};

const formatHHMMSS = (minutes: number) => {
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export default function LiveETAPanel({
  schedule,
  tNowMinutes,
  selectedStop,
  onSelectStop,
}: LiveETAPanelProps) {
  const [walkMinutes, setWalkMinutes] = useState<number>(5);

  const stops = useMemo(() => Object.values(CAMPUS_STOPS), []);
  const effectiveStopId = selectedStop ?? DEFAULT_STOP;
  const stopInfo = CAMPUS_STOPS[effectiveStopId];

  const arrivals = useMemo(
    () => computeNextArrivals(schedule, effectiveStopId, tNowMinutes, 120),
    [schedule, effectiveStopId, tNowMinutes]
  );

  const soonest = arrivals[0] ?? null;
  const others = arrivals.slice(1, 4);

  // "ต้องออกจากที่พักตอนไหน" = soonest arrival − walkMinutes
  // Shows the latest time the user can start walking to catch the soonest bus
  const leaveBy = soonest ? soonest.arrivalMinutes - walkMinutes : null;
  const leaveCountdown = leaveBy !== null ? leaveBy - tNowMinutes : null;

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header: stop selector */}
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            ป้ายที่คุณจะขึ้นรถ
          </div>
          <div className="text-[15px] font-semibold text-neutral-900 mt-0.5 truncate">
            {stopInfo?.nameTh ?? effectiveStopId}
          </div>
        </div>

        <select
          value={effectiveStopId}
          onChange={(e) => onSelectStop(e.target.value)}
          className="h-9 pl-3 pr-8 text-[12px] bg-white border border-neutral-200 rounded-lg text-neutral-800 font-medium hover:border-neutral-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition max-w-[60%]"
        >
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameTh}
            </option>
          ))}
        </select>
      </div>

      {/* Hero countdown — soonest bus */}
      {!soonest ? (
        <div className="px-6 py-10 text-center">
          <div className="text-[14px] font-medium text-neutral-700">
            ไม่มีรถให้บริการที่ป้ายนี้ในอีก 2 ชม. ข้างหน้า
          </div>
          <div className="text-[12px] text-neutral-500 mt-1">
            ลองเลือกป้ายอื่น หรือดูตารางเวลา
          </div>
        </div>
      ) : (
        <HeroCountdown
          routeIdx={soonest.routeIdx}
          etaMinutes={soonest.etaMinutes}
          arrivalMinutes={soonest.arrivalMinutes}
        />
      )}

      {/* Leave-at calculator */}
      {soonest && leaveCountdown !== null && (
        <LeaveAtRow
          walkMinutes={walkMinutes}
          onWalkChange={setWalkMinutes}
          leaveBy={leaveBy!}
          leaveCountdown={leaveCountdown}
        />
      )}

      {/* Other upcoming buses */}
      {others.length > 0 && (
        <div className="border-t border-neutral-100">
          <div className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            รถคันถัดไป
          </div>
          <ul className="divide-y divide-neutral-100">
            {others.map((a) => (
              <li
                key={a.routeIdx}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <RouteBadge index={a.routeIdx} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-neutral-900">
                      สาย {a.routeIdx + 1}
                    </div>
                    <div className="text-[11px] text-neutral-500 tabular-nums">
                      ถึง{" "}
                      {Math.floor(a.arrivalMinutes / 60)
                        .toString()
                        .padStart(2, "0")}
                      :
                      {Math.floor(a.arrivalMinutes % 60)
                        .toString()
                        .padStart(2, "0")}
                    </div>
                  </div>
                </div>
                <SecondaryETA minutes={a.etaMinutes} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   Hero countdown — the big "สาย X · 3:24" display
   ────────────────────────────────────────────────────────── */

function HeroCountdown({
  routeIdx,
  etaMinutes,
  arrivalMinutes,
}: {
  routeIdx: number;
  etaMinutes: number;
  arrivalMinutes: number;
}) {
  const { mm, ss, total } = formatMinSec(etaMinutes);
  const col = ROUTE_COLORS[routeIdx % ROUTE_COLORS.length];
  const arrivalHHMM = `${Math.floor(arrivalMinutes / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(arrivalMinutes % 60)
    .toString()
    .padStart(2, "0")}`;

  const urgency: "arrived" | "now" | "soon" | "safe" =
    total < 10 ? "arrived" : total < 60 ? "now" : total < 180 ? "soon" : "safe";

  const tone = {
    arrived: {
      label: "ถึงป้ายแล้ว",
      dot: "bg-emerald-500",
      text: "text-emerald-600",
    },
    now: {
      label: "กำลังจะถึง — รีบไป!",
      dot: "bg-emerald-500 animate-pulse",
      text: "text-emerald-600",
    },
    soon: {
      label: "ใกล้ถึงแล้ว",
      dot: "bg-amber-500",
      text: "text-amber-600",
    },
    safe: { label: "ยังมีเวลา", dot: "bg-neutral-400", text: "text-neutral-500" },
  }[urgency];

  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white text-[12px] font-semibold"
          style={{ backgroundColor: col.stroke }}
        >
          {routeIdx + 1}
        </span>
        <div className="text-[13px] font-medium text-neutral-800">
          รถสายถัดไปที่กำลังมา — สาย {routeIdx + 1}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div
          className="font-mono font-semibold text-neutral-900 leading-none tabular-nums"
          style={{ fontSize: "72px" }}
        >
          <span>{mm}</span>
          <span className="text-neutral-300">:</span>
          <span>{ss}</span>
        </div>
        <div className="pb-3 text-[13px] text-neutral-500 leading-tight">
          <div className="font-mono tabular-nums">นาที</div>
          <div className="mt-1">ถึง {arrivalHHMM}</div>
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium">
        <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
        <span className={tone.text}>{tone.label}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Leave-at calculator — "ต้องออกจากที่พักเวลา X"
   ────────────────────────────────────────────────────────── */

function LeaveAtRow({
  walkMinutes,
  onWalkChange,
  leaveBy,
  leaveCountdown,
}: {
  walkMinutes: number;
  onWalkChange: (v: number) => void;
  leaveBy: number;
  leaveCountdown: number;
}) {
  const { mm, ss } = formatMinSec(leaveCountdown);
  const leaveHHMMSS = formatHHMMSS(leaveBy);
  const missed = leaveCountdown < 0;
  const urgent = leaveCountdown >= 0 && leaveCountdown < 1;

  return (
    <div className="border-t border-neutral-100 px-5 py-4 bg-neutral-50/60">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 text-[12px] text-neutral-700">
          <span className="font-medium">เดินจากที่พักถึงป้าย</span>
          <input
            type="number"
            min={0}
            max={30}
            value={walkMinutes}
            onChange={(e) =>
              onWalkChange(Math.max(0, Math.min(30, Number(e.target.value) || 0)))
            }
            className="w-14 h-8 px-2 text-[12px] text-center bg-white border border-neutral-200 rounded-md text-neutral-800 font-mono tabular-nums focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
          <span className="text-neutral-500">นาที</span>
        </label>
      </div>

      <div className="mt-3 flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            ต้องออกจากที่พักเวลา
          </div>
          <div
            className={`font-mono font-semibold tabular-nums leading-none mt-1 ${
              missed
                ? "text-red-500"
                : urgent
                ? "text-amber-600"
                : "text-neutral-900"
            }`}
            style={{ fontSize: "28px" }}
          >
            {leaveHHMMSS}
          </div>
        </div>

        <div className="pb-1 text-[12px] text-neutral-500">
          {missed ? (
            <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              คันนี้ไปแล้ว — ดูคันถัดไปข้างล่าง
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  urgent ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span className="font-mono tabular-nums font-medium text-neutral-800">
                {mm}:{ss}
              </span>
              <span>{urgent ? "— ควรออกเดี๋ยวนี้" : "ก่อนต้องออก"}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────── */

function RouteBadge({ index }: { index: number }) {
  const col = ROUTE_COLORS[index % ROUTE_COLORS.length];
  return (
    <span
      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
      style={{ backgroundColor: col.stroke }}
    >
      {index + 1}
    </span>
  );
}

function SecondaryETA({ minutes }: { minutes: number }) {
  const { mm, ss } = formatMinSec(minutes);
  return (
    <div className="text-right">
      <div className="text-[14px] font-semibold text-neutral-900 font-mono tabular-nums leading-none">
        {mm}:{ss}
      </div>
      <div className="text-[10px] text-neutral-500 mt-0.5">นาที</div>
    </div>
  );
}
