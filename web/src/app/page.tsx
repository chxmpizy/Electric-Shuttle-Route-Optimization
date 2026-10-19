"use client";

import { useState } from "react";
import { SimulationResult, RouteSchedule } from "@/types/shuttle";
import { PRECOMPUTED_SCHEDULES } from "@/data/schedules";
import { DEFAULT_BENCHMARK_DATA } from "@/components/BenchmarkComparisonChart";
import CampusTransitMap from "@/components/CampusTransitMap";
import MetricsComparisonCharts from "@/components/MetricsComparisonCharts";
import BenchmarkComparisonChart from "@/components/BenchmarkComparisonChart";
import RouteFleetCharts from "@/components/RouteFleetCharts";
import ConvergenceChart from "@/components/ConvergenceChart";
import MobilityPanel from "@/components/MobilityPanel";
import TripPlanner from "@/components/TripPlanner";

type TabKey =
  | "network"
  | "metrics"
  | "benchmark"
  | "fleet"
  | "convergence"
  | "mobility"
  | "planner"
  | "schedule";

interface TabItem {
  key: TabKey;
  icon: string;
  labelEn: string;
  labelTh: string;
  group: "overview" | "analysis" | "detail" | "student";
}

const TAB_ITEMS: TabItem[] = [
  { key: "network", icon: "🗺️", labelEn: "Transit Network", labelTh: "โครงข่ายเส้นทาง", group: "overview" },
  { key: "metrics", icon: "📊", labelEn: "Performance", labelTh: "เปรียบเทียบประสิทธิภาพ", group: "overview" },
  { key: "benchmark", icon: "🏆", labelEn: "All-Algo Benchmark", labelTh: "เปรียบเทียบทุกตัว", group: "overview" },
  { key: "convergence", icon: "📉", labelEn: "Convergence", labelTh: "ลู่เข้าของอัลกอริทึม", group: "analysis" },
  { key: "mobility", icon: "🚶", labelEn: "Mobility", labelTh: "การเดินทางของผู้โดยสาร", group: "analysis" },
  { key: "fleet", icon: "⏱️", labelEn: "Fleet & Headway", labelTh: "ความถี่และรถ", group: "analysis" },
  { key: "planner", icon: "🎯", labelEn: "Trip Planner", labelTh: "วางแผนไปเรียนให้ทัน", group: "student" },
  { key: "schedule", icon: "📋", labelEn: "Route Timetable", labelTh: "ตารางเวลาเทียบท่า", group: "detail" },
];

const GROUP_LABELS: Record<TabItem["group"], string> = {
  overview: "ภาพรวม (Overview)",
  analysis: "วิเคราะห์เชิงลึก (Analysis)",
  student: "สำหรับผู้โดยสาร (Student)",
  detail: "รายละเอียด (Details)",
};

const ALGO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "baseline", label: "Baseline — เส้นทางเดิม" },
  { value: "ga", label: "Genetic Algorithm (GA)" },
  { value: "sa", label: "Simulated Annealing (SA)" },
  { value: "pso", label: "Particle Swarm (PSO)" },
  { value: "aco", label: "Ant Colony (ACO)" },
];

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = Math.round(minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

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
        `${err.message || "Failed to reach API server."} (ระบบได้โหลดชุดข้อมูลสำรองของ ${selectedMode.toUpperCase()} ให้แทนแล้ว)`
      );
      setResults(getPrecomputedResult(selectedMode));
    }
    setLoading(false);
  };

  const launchSumo = async () => {
    setSumoStatus({
      type: "info",
      msg: `กำลังเปิด SUMO-GUI สำหรับ ${selectedMode.toUpperCase()}...`,
    });
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/launch/${selectedMode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unknown error from API");
      setSumoStatus({
        type: "success",
        msg: `🎉 เปิด SUMO-GUI (${selectedMode.toUpperCase()}) สำเร็จ — กด Play สีเขียวเพื่อเริ่มเดินรถ`,
      });
    } catch (error: unknown) {
      const err = error as Error;
      setSumoStatus({
        type: "error",
        msg: `❌ เปิด SUMO-GUI ไม่ได้: ${err.message} (ตรวจ XQuartz + api_server.py)`,
      });
    }
  };

  const activeBaselineSchedule =
    results?.baseline_schedule || PRECOMPUTED_SCHEDULES.baseline || [];
  const activeOptimizedSchedule =
    results?.schedule || PRECOMPUTED_SCHEDULES[selectedMode] || [];
  const activeTabItem = TAB_ITEMS.find((t) => t.key === activeTab);

  // Group tabs by category for sidebar sections
  const groupedTabs = TAB_ITEMS.reduce<Record<TabItem["group"], TabItem[]>>(
    (acc, t) => {
      (acc[t.group] ||= []).push(t);
      return acc;
    },
    { overview: [], analysis: [], student: [], detail: [] }
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* ─── LEFT SIDEBAR ────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
        {/* Logo / Brand */}
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">🚌</span>
            <div>
              <h1 className="text-base font-extrabold text-blue-800 leading-tight">
                UniFlow EV
              </h1>
              <p className="text-[10px] text-slate-500 leading-tight">
                TU Rangsit Shuttle Optimizer
              </p>
            </div>
          </div>
          <div className="mt-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Simulation Ready
          </div>
        </div>

        {/* Algorithm picker + Run controls */}
        <div className="px-5 py-4 border-b border-slate-200 space-y-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Algorithm
          </label>
          <select
            value={selectedMode}
            onChange={(e) => handleModeChange(e.target.value)}
            className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
          >
            {ALGO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-4 gap-1">
            {(["ga", "sa", "pso", "aco"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`py-1.5 rounded-md text-[10px] font-bold uppercase transition ${
                  selectedMode === m
                    ? "bg-blue-700 text-white shadow-sm ring-1 ring-blue-300"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={runSimulation}
            disabled={loading}
            className="w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition shadow-sm flex items-center justify-center space-x-1.5"
          >
            <span>{loading ? "⏳" : "🚀"}</span>
            <span>{loading ? "กำลังจำลอง..." : "Run Live Simulation"}</span>
          </button>
          <button
            onClick={launchSumo}
            disabled={loading || !results}
            className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition shadow-sm flex items-center justify-center space-x-1.5"
          >
            <span>🗺️</span>
            <span>Open SUMO-GUI</span>
          </button>
        </div>

        {/* Vertical nav — grouped by category */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {(Object.keys(groupedTabs) as TabItem["group"][]).map((group) => (
            <div key={group}>
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {GROUP_LABELS[group]}
              </div>
              <div className="space-y-0.5">
                {groupedTabs[group].map((t) => {
                  const active = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                        active
                          ? "bg-blue-50 border border-blue-200 shadow-sm"
                          : "border border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-lg leading-none">{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-bold truncate ${
                            active ? "text-blue-700" : "text-slate-700"
                          }`}
                        >
                          {t.labelEn}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {t.labelTh}
                        </div>
                      </div>
                      {active && (
                        <span className="w-1 h-6 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 text-[10px] text-slate-400">
          UniFlow EV &bull; Senior Project 2026
        </div>
      </aside>

      {/* ─── RIGHT MAIN CONTENT ─────────────────────────────────────── */}
      <section className="flex-1 min-w-0 overflow-x-hidden">
        {/* Top strip: breadcrumb + data source badges */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-6 md:px-8 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-lg">{activeTabItem?.icon}</span>
            <span className="font-bold text-slate-800">{activeTabItem?.labelEn}</span>
            <span className="hidden md:inline text-xs text-slate-500">
              ({activeTabItem?.labelTh})
            </span>
          </div>

          {results && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ml-auto text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-[10px] ${
                  results.data_source === "live"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-200 text-slate-700 border border-slate-300"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    results.data_source === "live" ? "bg-emerald-500" : "bg-slate-500"
                  }`}
                />
                {results.data_source === "live" ? "LIVE RUN" : "DEMO DATA"}
              </span>
              {typeof results.elapsed_sec === "number" && results.elapsed_sec > 0 && (
                <span className="text-slate-600">
                  ⏱️ <b>{results.elapsed_sec.toFixed(2)}s</b>
                </span>
              )}
              {typeof results.on_time_rate_pct === "number" && (
                <span className="text-slate-600">
                  🎯 On-time <b>{results.on_time_rate_pct.toFixed(1)}%</b>
                </span>
              )}
              {typeof results.fleet_utilization_pct === "number" && (
                <span className="text-slate-600">
                  🚌 Util <b>{results.fleet_utilization_pct.toFixed(1)}%</b>
                </span>
              )}
              {typeof results.total_buses === "number" && (
                <span className="text-slate-600">
                  🚐 <b>{results.total_buses}</b> คัน
                </span>
              )}
              {results.history && results.history.length > 0 && (
                <span className="text-slate-600">
                  📉 <b>{results.history.length}</b> iters
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-6 max-w-6xl">
          {/* SUMO status banner */}
          {sumoStatus && (
            <div
              className={`p-3.5 rounded-xl border text-sm flex items-start justify-between gap-3 transition ${
                sumoStatus.type === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : sumoStatus.type === "error"
                  ? "bg-red-50 border-red-300 text-red-900"
                  : "bg-blue-50 border-blue-300 text-blue-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {sumoStatus.type === "success"
                    ? "🖥️"
                    : sumoStatus.type === "error"
                    ? "⚠️"
                    : "⏳"}
                </span>
                <span>{sumoStatus.msg}</span>
              </div>
              <button
                onClick={() => setSumoStatus(null)}
                className="text-xs font-bold opacity-60 hover:opacity-100 px-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error banner */}
          {errorMsg && (
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-900 text-sm flex items-start gap-2.5">
              <span className="text-lg">ℹ️</span>
              <div>
                <span className="font-bold">สถานะการเชื่อมต่อ: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* ─── ACTIVE PANEL ─── */}
          {activeTab === "network" && (
            <section className="space-y-6">
              <CampusTransitMap
                baselineSchedule={activeBaselineSchedule}
                optimizedSchedule={activeOptimizedSchedule}
                selectedMode={selectedMode}
              />
              {results && (
                <MetricsComparisonCharts
                  results={results}
                  selectedMode={selectedMode}
                />
              )}
            </section>
          )}

          {activeTab === "metrics" && results && (
            <section className="space-y-6">
              <MetricsComparisonCharts
                results={results}
                selectedMode={selectedMode}
              />
              <RouteFleetCharts
                baselineSchedule={activeBaselineSchedule}
                optimizedSchedule={activeOptimizedSchedule}
                selectedMode={selectedMode}
              />
            </section>
          )}

          {activeTab === "benchmark" && (
            <section className="space-y-6">
              <BenchmarkComparisonChart currentAlgorithm={selectedMode} />
              {results && (
                <MetricsComparisonCharts
                  results={results}
                  selectedMode={selectedMode}
                />
              )}
            </section>
          )}

          {activeTab === "fleet" && (
            <section className="space-y-6">
              <RouteFleetCharts
                baselineSchedule={activeBaselineSchedule}
                optimizedSchedule={activeOptimizedSchedule}
                selectedMode={selectedMode}
              />
            </section>
          )}

          {activeTab === "convergence" && (
            <section className="space-y-6">
              <ConvergenceChart
                history={results?.history ?? []}
                algorithm={results?.algorithm || selectedMode}
                elapsedSec={results?.elapsed_sec}
              />
            </section>
          )}

          {activeTab === "planner" && (
            <section className="space-y-6">
              <TripPlanner selectedAlgorithm={selectedMode} />
            </section>
          )}

          {activeTab === "mobility" && (
            <section className="space-y-6">
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
            </section>
          )}

          {activeTab === "schedule" && activeOptimizedSchedule.length > 0 && (
            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    📋 Optimized Route Schedule &amp; Timetable ({selectedMode.toUpperCase()})
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    ตารางเวลาเทียบท่าและลำดับป้ายจอดตามมาตรฐานสถานีขนส่ง
                  </p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full">
                  {activeOptimizedSchedule.length} สาย
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse rounded-xl overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider">
                      <th className="p-3.5 border-b">Route</th>
                      <th className="p-3.5 border-b">Path &amp; Arrival Timetable</th>
                      <th className="p-3.5 border-b text-center">Buses</th>
                      <th className="p-3.5 border-b text-center">Headway</th>
                      <th className="p-3.5 border-b text-center">Operating Hours</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {activeOptimizedSchedule.map((route: RouteSchedule, index: number) => (
                      <tr key={index} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Route {index + 1}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {route.path.map((stop: string, i: number) => (
                              <span key={i} className="flex items-center">
                                <span className="bg-slate-100 hover:bg-blue-50 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg shadow-xs border border-slate-200 flex flex-col items-center transition">
                                  <span className="font-medium">{stop}</span>
                                  {route.timetable && route.timetable[i] && (
                                    <span className="text-[10px] font-bold mt-0.5 text-blue-600 border-t border-slate-200 pt-0.5 w-full text-center">
                                      {formatTime(route.timetable[i].arrival_time)}
                                    </span>
                                  )}
                                </span>
                                {i < route.path.length - 1 && (
                                  <span className="text-slate-400 mx-1 text-xs">➔</span>
                                )}
                              </span>
                            ))}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1.5">
                            <span>⏱️ คันแรกถึงป้ายตามเวลาด้านบน และคันถัดไปจะมาถึงทุก ๆ</span>
                            <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                              {route.headway.toFixed(1)} นาที
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-700">
                          {route.num_bus} คัน
                        </td>
                        <td className="p-3.5 text-center text-slate-700 font-semibold">
                          {route.headway.toFixed(1)} นาที
                        </td>
                        <td className="p-3.5 text-center text-slate-700">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs whitespace-nowrap border font-mono">
                            {formatTime(route.startTime)} - {formatTime(route.endTime)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-slate-500 text-xs text-center pt-2">
                * กด &quot;Open SUMO-GUI&quot; ที่ sidebar เพื่อดูการจำลองการวิ่งจริงของรถเมล์
              </p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
