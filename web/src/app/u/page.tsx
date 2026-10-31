"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import { PRECOMPUTED_SCHEDULES } from "@/data/schedules";
import LiveETAPanel from "@/components/LiveETAPanel";
import ScheduleTable from "@/components/ScheduleTable";
import TripPlanner from "@/components/TripPlanner";

// Leaflet needs window — load only on client
const LiveMapGeo = dynamic(() => import("@/components/LiveMapGeo"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl border border-neutral-200 h-[520px] flex items-center justify-center">
      <div className="text-[13px] text-neutral-500">กำลังโหลดแผนที่…</div>
    </div>
  ),
});

/* ──────────────────────────────────────────────────────────
   Config
   ────────────────────────────────────────────────────────── */

const DEFAULT_ALGO = "ga";

type TabKey = "live" | "schedule" | "planner";

interface TabItem {
  key: TabKey;
  label: string;
  sub: string;
}

const TABS: TabItem[] = [
  { key: "live", label: "แผนที่", sub: "รถเมล์ตอนนี้" },
  { key: "schedule", label: "ตารางเวลา", sub: "เทียบท่าแต่ละสาย" },
  { key: "planner", label: "วางแผน", sub: "ไปเรียนให้ทัน" },
];

/* ──────────────────────────────────────────────────────────
   Hooks / helpers
   ────────────────────────────────────────────────────────── */

function currentMinutesFromClock() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function formatHHMM(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = Math.floor(m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

function useLiveClock(enabled: boolean, overrideMinutes: number | null) {
  const [tick, setTick] = useState(() => currentMinutesFromClock());

  useEffect(() => {
    if (!enabled) return;
    // Sub-second cadence keeps bus positions and countdowns moving continuously
    const timer = setInterval(() => setTick(currentMinutesFromClock()), 500);
    return () => clearInterval(timer);
  }, [enabled]);

  return overrideMinutes ?? tick;
}

/* ──────────────────────────────────────────────────────────
   Icons
   ────────────────────────────────────────────────────────── */

type SvgProps = { className?: string };
const svgBase =
  "shrink-0 stroke-current fill-none [stroke-linecap:round] [stroke-linejoin:round]";

function IconMap(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.7" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" />
      <path d="M9 3v16M15 5v16" />
    </svg>
  );
}
function IconList(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.7" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeWidth="2.2" />
    </svg>
  );
}
function IconTarget(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.7" className={`${svgBase} ${p.className ?? ""}`}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}
function IconArrowRight(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.7" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

const TAB_ICONS: Record<TabKey, (p: SvgProps) => React.ReactElement> = {
  live: IconMap,
  schedule: IconList,
  planner: IconTarget,
};

/* ──────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────── */

export default function UserHome() {
  const [activeTab, setActiveTab] = useState<TabKey>("live");
  const [algo] = useState<string>(DEFAULT_ALGO);
  const [simMode, setSimMode] = useState<boolean>(false);
  const [simTimeHHMM, setSimTimeHHMM] = useState<string>("08:00");
  const [selectedStop, setSelectedStop] = useState<string | null>(null);

  const schedule = useMemo(
    () => PRECOMPUTED_SCHEDULES[algo] || PRECOMPUTED_SCHEDULES.ga || [],
    [algo]
  );

  const simMinutes = useMemo(() => {
    if (!simMode) return null;
    const [h, m] = simTimeHHMM.split(":").map((v) => parseInt(v, 10));
    return (h || 0) * 60 + (m || 0);
  }, [simMode, simTimeHHMM]);

  const tNow = useLiveClock(!simMode, simMinutes);
  const activeTabItem = TABS.find((t) => t.key === activeTab)!;

  return (
    <main className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      {/* ─── Top header ───────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tight">
              UF
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-neutral-900">
                UniFlow EV
              </div>
              <div className="text-[11px] text-neutral-500">
                รถเมล์ มธ. ศูนย์รังสิต
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live clock */}
            <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-neutral-600">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  simMode ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                }`}
              />
              <span className="font-mono tabular-nums font-medium text-neutral-800">
                {formatHHMM(tNow)}
              </span>
              <span className="text-neutral-500">
                {simMode ? "จำลอง" : "สด"}
              </span>
            </div>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1 h-8 px-2.5 text-[12px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition"
            >
              Admin
              <IconArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Mobile live clock */}
        <div className="sm:hidden px-5 pb-2 flex items-center gap-1.5 text-[11px] text-neutral-600">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              simMode ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
            }`}
          />
          <span className="font-mono tabular-nums font-medium text-neutral-800">
            {formatHHMM(tNow)}
          </span>
          <span className="text-neutral-500">
            {simMode ? "จำลอง" : "เวลาปัจจุบัน"}
          </span>
        </div>
      </header>

      {/* ─── Desktop tabs (hidden on mobile) ──────────────── */}
      <div className="hidden md:block border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-5 flex items-center gap-1">
          {TABS.map((t) => {
            const Icon = TAB_ICONS[t.key];
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`relative inline-flex items-center gap-2 px-4 h-12 text-[13px] font-medium transition ${
                  active
                    ? "text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {active && (
                  <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-neutral-900 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────────── */}
      <section className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 py-5 pb-24 md:pb-8 space-y-5">
        {/* Section title (shows on mobile too) */}
        <div className="md:hidden px-1">
          <h1 className="text-[18px] font-semibold text-neutral-900 leading-tight">
            {activeTabItem.label}
          </h1>
          <p className="text-[12px] text-neutral-500 mt-0.5">
            {activeTabItem.sub}
          </p>
        </div>

        {/* Simulation time toggle — only on Live map tab */}
        {activeTab === "live" && (
          <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-[12px] text-neutral-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simMode}
                onChange={(e) => setSimMode(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              />
              จำลองเวลา
              <span className="text-neutral-400 text-[11px]">
                (เผื่อดูช่วงที่อยากดู)
              </span>
            </label>
            {simMode && (
              <input
                type="time"
                value={simTimeHHMM}
                onChange={(e) => setSimTimeHHMM(e.target.value)}
                className="h-8 px-2.5 text-[12px] bg-white border border-neutral-200 rounded-md text-neutral-800 font-mono tabular-nums focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            )}
          </div>
        )}

        {/* Active panel */}
        {activeTab === "live" && (
          <>
            {/* Hero ETA — the "ควรออกตอนไหน" decision */}
            <LiveETAPanel
              schedule={schedule}
              tNowMinutes={tNow}
              selectedStop={selectedStop}
              onSelectStop={setSelectedStop}
            />
            {/* Real geographic map with live buses */}
            <LiveMapGeo
              schedule={schedule}
              mode={algo}
              tNowMinutes={tNow}
              selectedStopId={selectedStop}
              onSelectStop={setSelectedStop}
            />
          </>
        )}

        {activeTab === "schedule" && (
          <ScheduleTable
            schedule={schedule}
            mode={algo}
            footerHint="เลขสีน้ำเงินใต้ชื่อป้าย = เวลาที่รถคันแรกถึงป้ายนั้น"
          />
        )}

        {activeTab === "planner" && <TripPlanner selectedAlgorithm={algo} />}
      </section>

      {/* ─── Mobile bottom tab bar ────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200">
        <div className="grid grid-cols-3 h-16">
          {TABS.map((t) => {
            const Icon = TAB_ICONS[t.key];
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex flex-col items-center justify-center gap-0.5 transition ${
                  active ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{t.label}</span>
                {active && (
                  <span className="absolute top-0 w-10 h-0.5 bg-neutral-900 rounded-b-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

