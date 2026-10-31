"use client";

import { useState } from "react";
import Link from "next/link";
import { SimulationResult } from "@/types/shuttle";
import { PRECOMPUTED_SCHEDULES } from "@/data/schedules";
import { DEFAULT_BENCHMARK_DATA } from "@/components/BenchmarkComparisonChart";
import CampusTransitMap from "@/components/CampusTransitMap";
import MetricsComparisonCharts from "@/components/MetricsComparisonCharts";
import BenchmarkComparisonChart from "@/components/BenchmarkComparisonChart";
import RouteFleetCharts from "@/components/RouteFleetCharts";
import ConvergenceChart from "@/components/ConvergenceChart";
import MobilityPanel from "@/components/MobilityPanel";
import TripPlanner from "@/components/TripPlanner";
import ScheduleTable from "@/components/ScheduleTable";

/* ──────────────────────────────────────────────────────────────
   Types & constants
   ────────────────────────────────────────────────────────────── */

type TabKey =
  | "network"
  | "metrics"
  | "benchmark"
  | "fleet"
  | "convergence"
  | "mobility"
  | "planner"
  | "schedule";

type IconKey =
  | "map"
  | "chart"
  | "trophy"
  | "trend"
  | "users"
  | "clock"
  | "target"
  | "list";

interface TabItem {
  key: TabKey;
  icon: IconKey;
  label: string;
  hint: string;
  group: "overview" | "analysis" | "student" | "detail";
}

const TAB_ITEMS: TabItem[] = [
  { key: "network",     icon: "map",    label: "โครงข่ายเส้นทาง",       hint: "แผนที่สายรถ",         group: "overview" },
  { key: "metrics",     icon: "chart",  label: "เปรียบเทียบประสิทธิภาพ", hint: "Baseline vs Optimized", group: "overview" },
  { key: "benchmark",   icon: "trophy", label: "เทียบทุกอัลกอริทึม",      hint: "GA / SA / PSO / ACO",   group: "overview" },
  { key: "convergence", icon: "trend",  label: "การลู่เข้าของอัลกอริทึม", hint: "Convergence curve",    group: "analysis" },
  { key: "mobility",    icon: "users",  label: "การเดินทางของผู้โดยสาร",  hint: "Mobility & OD",         group: "analysis" },
  { key: "fleet",       icon: "clock",  label: "ความถี่และจำนวนรถ",       hint: "Headway & fleet",      group: "analysis" },
  { key: "planner",     icon: "target", label: "วางแผนไปเรียนให้ทัน",     hint: "Trip planner",         group: "student" },
  { key: "schedule",    icon: "list",   label: "ตารางเวลาเทียบท่า",       hint: "Route timetable",      group: "detail" },
];

const GROUP_LABELS: Record<TabItem["group"], string> = {
  overview: "ภาพรวม",
  analysis: "วิเคราะห์เชิงลึก",
  student: "สำหรับผู้โดยสาร",
  detail: "รายละเอียด",
};

const ALGO_OPTIONS: Array<{ value: string; label: string; full: string }> = [
  { value: "baseline", label: "Baseline", full: "เส้นทางเดิม" },
  { value: "ga",       label: "GA",       full: "Genetic Algorithm" },
  { value: "sa",       label: "SA",       full: "Simulated Annealing" },
  { value: "pso",      label: "PSO",      full: "Particle Swarm" },
  { value: "aco",      label: "ACO",      full: "Ant Colony" },
];

const getPrecomputedResult = (mode: string): SimulationResult => {
  const baseBench = DEFAULT_BENCHMARK_DATA.baseline;
  const optBench = DEFAULT_BENCHMARK_DATA[mode] || DEFAULT_BENCHMARK_DATA.ga;
  const baseSched = PRECOMPUTED_SCHEDULES.baseline || [];
  const optSched = PRECOMPUTED_SCHEDULES[mode] || PRECOMPUTED_SCHEDULES.ga || [];

  return {
    baseline_wait: baseBench.wait_time,
    baseline_travel: baseBench.travel_time,
    baseline_served: baseBench.served,
    baseline_waiting: baseBench.waiting,
    baseline_schedule: baseSched,
    optimized_wait: optBench.wait_time,
    optimized_travel: optBench.travel_time,
    optimized_served: optBench.served,
    optimized_waiting: optBench.waiting,
    schedule: optSched,
    data_source: "demo",
  };
};

/* ──────────────────────────────────────────────────────────────
   Monochrome line icons (Lucide-style, inline — no deps)
   ────────────────────────────────────────────────────────────── */

type SvgProps = { className?: string };
const svgBase =
  "shrink-0 stroke-current fill-none [stroke-linecap:round] [stroke-linejoin:round]";

function IconMap(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" />
      <path d="M9 3v16M15 5v16" />
    </svg>
  );
}
function IconChart(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M3 3v18h18" />
      <path d="M7 15v3M12 10v8M17 6v12" />
    </svg>
  );
}
function IconTrophy(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M17 6h3a3 3 0 0 1-3 3M7 6H4a3 3 0 0 0 3 3" />
      <path d="M10 15h4v3h-4zM8 21h8" />
    </svg>
  );
}
function IconTrend(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M21 17v-5h-5" />
    </svg>
  );
}
function IconUsers(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20c0-2.4 1.5-4.5 4-5" />
    </svg>
  );
}
function IconClock(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconTarget(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}
function IconList(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeWidth="2.2" />
    </svg>
  );
}
function IconPlay(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M7 5v14l12-7L7 5Z" />
    </svg>
  );
}
function IconExternal(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
    </svg>
  );
}
function IconClose(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.6" className={`${svgBase} ${p.className ?? ""}`}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
const ICONS: Record<IconKey, (p: SvgProps) => React.ReactElement> = {
  map: IconMap,
  chart: IconChart,
  trophy: IconTrophy,
  trend: IconTrend,
  users: IconUsers,
  clock: IconClock,
  target: IconTarget,
  list: IconList,
};

/* ──────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────── */

export default function Home() {
  const [selectedMode, setSelectedMode] = useState<string>("ga");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SimulationResult | null>(() =>
    getPrecomputedResult("ga")
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sumoStatus, setSumoStatus] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("network");

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode);
    setResults(getPrecomputedResult(mode));
    setErrorMsg(null);
    setSumoStatus(null);
  };

  const runSimulation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSumoStatus(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/run/${selectedMode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unknown error from API");
      setResults({ ...data, data_source: data.data_source || "live" });
    } catch (error: unknown) {
      console.warn("API fetch failed, falling back to precomputed data.", error);
      const err = error as Error;
      setErrorMsg(
        `${err.message || "Failed to reach API server."} — ระบบได้โหลดชุดข้อมูลสำรองของ ${selectedMode.toUpperCase()} ให้แทนแล้ว`
      );
      setResults(getPrecomputedResult(selectedMode));
    }
    setLoading(false);
  };

  const launchSumo = async () => {
    setSumoStatus({
      type: "info",
      msg: `กำลังเปิด SUMO-GUI สำหรับ ${selectedMode.toUpperCase()}…`,
    });
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/launch/${selectedMode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unknown error from API");
      setSumoStatus({
        type: "success",
        msg: `เปิด SUMO-GUI (${selectedMode.toUpperCase()}) สำเร็จ — กด Play สีเขียวเพื่อเริ่มเดินรถ`,
      });
    } catch (error: unknown) {
      const err = error as Error;
      setSumoStatus({
        type: "error",
        msg: `เปิด SUMO-GUI ไม่ได้: ${err.message} (ตรวจ XQuartz + api_server.py)`,
      });
    }
  };

  const activeBaselineSchedule =
    results?.baseline_schedule || PRECOMPUTED_SCHEDULES.baseline || [];
  const activeOptimizedSchedule =
    results?.schedule || PRECOMPUTED_SCHEDULES[selectedMode] || [];
  const activeTabItem = TAB_ITEMS.find((t) => t.key === activeTab);

  const groupedTabs = TAB_ITEMS.reduce<Record<TabItem["group"], TabItem[]>>(
    (acc, t) => {
      (acc[t.group] ||= []).push(t);
      return acc;
    },
    { overview: [], analysis: [], student: [], detail: [] }
  );

  const isLive = results?.data_source === "live";

  return (
    <main className="min-h-screen flex bg-neutral-50 text-neutral-900">
      {/* ─── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-white border-r border-neutral-200 flex flex-col h-screen sticky top-0">
        {/* Brand */}
        <div className="px-5 h-16 flex items-center border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tight">
              UF
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-neutral-900">UniFlow EV</div>
              <div className="text-[11px] text-neutral-500">TU Rangsit Shuttle</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-5 space-y-6">
          {(Object.keys(groupedTabs) as TabItem["group"][]).map((group) => (
            <div key={group}>
              <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                {GROUP_LABELS[group]}
              </div>
              <div className="space-y-0.5">
                {groupedTabs[group].map((t) => {
                  const Icon = ICONS[t.icon];
                  const active = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        active
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      <Icon
                        className={`w-[18px] h-[18px] ${
                          active ? "text-white" : "text-neutral-400 group-hover:text-neutral-700"
                        }`}
                      />
                      <span className="text-[13px] font-medium truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-neutral-200 space-y-2">
          <Link
            href="/u"
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-neutral-700 hover:bg-neutral-100 transition"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              เปิดโหมดผู้ใช้
            </span>
            <svg
              viewBox="0 0 24 24"
              strokeWidth="1.7"
              className="w-3.5 h-3.5 shrink-0 stroke-current fill-none [stroke-linecap:round] [stroke-linejoin:round] text-neutral-400"
            >
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </Link>
          <div className="px-3 text-[11px] text-neutral-400">
            Senior Project · 2026
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <section className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md border-b border-neutral-200">
          <div className="px-8 h-16 flex items-center gap-4">
            {/* Title */}
            <div className="min-w-0">
              <div className="text-[11px] text-neutral-500 leading-none mb-1">
                Dashboard
              </div>
              <h1 className="text-[15px] font-semibold text-neutral-900 leading-none truncate">
                {activeTabItem?.label}
              </h1>
            </div>

            {/* Right controls */}
            <div className="ml-auto flex items-center gap-2">
              <select
                value={selectedMode}
                onChange={(e) => handleModeChange(e.target.value)}
                className="h-9 pl-3 pr-8 text-[13px] bg-white border border-neutral-200 rounded-lg text-neutral-800 font-medium hover:border-neutral-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              >
                {ALGO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {o.full}
                  </option>
                ))}
              </select>

              <button
                onClick={launchSumo}
                disabled={loading || !results}
                className="h-9 px-3 inline-flex items-center gap-1.5 border border-neutral-200 rounded-lg text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <IconExternal className="w-4 h-4" />
                SUMO-GUI
              </button>

              <button
                onClick={runSimulation}
                disabled={loading}
                className="h-9 px-4 inline-flex items-center gap-1.5 bg-neutral-900 text-white rounded-lg text-[13px] font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <IconPlay className="w-4 h-4" />
                {loading ? "กำลังจำลอง…" : "Run"}
              </button>
            </div>
          </div>

          {/* Metrics strip */}
          {results && (
            <div className="px-8 h-11 flex items-center gap-6 border-t border-neutral-100 text-[12px]">
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLive ? "bg-emerald-500" : "bg-neutral-400"
                  }`}
                />
                {isLive ? "Live run" : "Demo data"}
              </span>

              {typeof results.on_time_rate_pct === "number" && (
                <Metric label="On-time" value={`${results.on_time_rate_pct.toFixed(1)}%`} />
              )}
              {typeof results.fleet_utilization_pct === "number" && (
                <Metric label="Fleet util" value={`${results.fleet_utilization_pct.toFixed(1)}%`} />
              )}
              {typeof results.total_buses === "number" && (
                <Metric label="Buses" value={`${results.total_buses}`} />
              )}
              {typeof results.elapsed_sec === "number" && results.elapsed_sec > 0 && (
                <Metric label="Elapsed" value={`${results.elapsed_sec.toFixed(2)}s`} />
              )}
              {results.history && results.history.length > 0 && (
                <Metric label="Iterations" value={`${results.history.length}`} />
              )}
            </div>
          )}
        </header>

        {/* Body */}
        <div className="p-8 space-y-5 max-w-6xl">
          {/* Status banners */}
          {sumoStatus && (
            <Banner
              variant={sumoStatus.type}
              message={sumoStatus.msg}
              onClose={() => setSumoStatus(null)}
            />
          )}
          {errorMsg && (
            <Banner variant="warning" message={errorMsg} title="สถานะการเชื่อมต่อ" />
          )}

          {/* Active panel */}
          {activeTab === "network" && (
            <>
              <CampusTransitMap
                baselineSchedule={activeBaselineSchedule}
                optimizedSchedule={activeOptimizedSchedule}
                selectedMode={selectedMode}
              />
              {results && (
                <MetricsComparisonCharts results={results} selectedMode={selectedMode} />
              )}
            </>
          )}

          {activeTab === "metrics" && results && (
            <>
              <MetricsComparisonCharts results={results} selectedMode={selectedMode} />
              <RouteFleetCharts
                baselineSchedule={activeBaselineSchedule}
                optimizedSchedule={activeOptimizedSchedule}
                selectedMode={selectedMode}
              />
            </>
          )}

          {activeTab === "benchmark" && (
            <>
              <BenchmarkComparisonChart currentAlgorithm={selectedMode} />
              {results && (
                <MetricsComparisonCharts results={results} selectedMode={selectedMode} />
              )}
            </>
          )}

          {activeTab === "fleet" && (
            <RouteFleetCharts
              baselineSchedule={activeBaselineSchedule}
              optimizedSchedule={activeOptimizedSchedule}
              selectedMode={selectedMode}
            />
          )}

          {activeTab === "convergence" && (
            <ConvergenceChart
              history={results?.history ?? []}
              algorithm={results?.algorithm || selectedMode}
              elapsedSec={results?.elapsed_sec}
            />
          )}

          {activeTab === "planner" && <TripPlanner selectedAlgorithm={selectedMode} />}

          {activeTab === "mobility" && (
            <MobilityPanel
              busStats={results?.bus_stats ?? []}
              onTimeRatePct={results?.on_time_rate_pct}
              latePassengers={results?.late_passengers}
              strandedPassengers={results?.stranded_passengers}
              totalPassengers={results?.total_passengers}
              totalBuses={results?.total_buses}
              fleetUtilPct={results?.fleet_utilization_pct}
              odMatrix={results?.od_matrix ?? []}
              timeseries={results?.mobility_timeseries ?? []}
            />
          )}

          {activeTab === "schedule" && activeOptimizedSchedule.length > 0 && (
            <ScheduleTable
              schedule={activeOptimizedSchedule}
              mode={selectedMode}
            />
          )}
        </div>
      </section>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────
   Subcomponents
   ────────────────────────────────────────────────────────────── */

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-neutral-600">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold text-neutral-900 tabular-nums">{value}</span>
    </span>
  );
}

function Banner({
  variant,
  message,
  title,
  onClose,
}: {
  variant: "success" | "error" | "info" | "warning";
  message: string;
  title?: string;
  onClose?: () => void;
}) {
  const dotColor =
    variant === "success"
      ? "bg-emerald-500"
      : variant === "error"
      ? "bg-red-500"
      : variant === "warning"
      ? "bg-amber-500"
      : "bg-indigo-500";

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white border border-neutral-200 text-[13px] text-neutral-800">
      <span className="mt-1.5 inline-flex items-center gap-2 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      </span>
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold text-neutral-900 mb-0.5">{title}</div>}
        <div className="text-neutral-600">{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          aria-label="Close"
        >
          <IconClose className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

