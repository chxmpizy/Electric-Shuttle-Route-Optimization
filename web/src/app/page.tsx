"use client";

import { useState } from "react";
import { SimulationResult, RouteSchedule } from "@/types/shuttle";
import { PRECOMPUTED_SCHEDULES } from "@/data/schedules";
import { DEFAULT_BENCHMARK_DATA } from "@/components/BenchmarkComparisonChart";
import CampusTransitMap from "@/components/CampusTransitMap";
import MetricsComparisonCharts from "@/components/MetricsComparisonCharts";
import BenchmarkComparisonChart from "@/components/BenchmarkComparisonChart";
import RouteFleetCharts from "@/components/RouteFleetCharts";

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.round(minutes % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
};

// Helper to construct simulation result from precomputed data
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
  };
};

export default function Home() {
  const [selectedMode, setSelectedMode] = useState<string>("ga");
  const [loading, setLoading] = useState<boolean>(false);
  // Initialize directly with GA comparison so graphs are immediately interactive on load
  const [results, setResults] = useState<SimulationResult | null>(() => getPrecomputedResult("ga"));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"network" | "metrics" | "benchmark" | "fleet" | "schedule">("network");

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode);
    setResults(getPrecomputedResult(mode));
    setErrorMsg(null);
  };

  const runSimulation = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/run/${selectedMode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unknown error from API");
      }
      setResults(data);
    } catch (error: unknown) {
      console.warn("API server fetch failed, displaying precomputed optimization data instead.", error);
      const err = error as Error;
      setErrorMsg(
        `${err.message || "Failed to reach API server."} (ระบบได้โหลดชุดข้อมูลการจำลองจริงล่าสุดของ ${selectedMode.toUpperCase()} ให้แทนเรียบร้อยแล้ว)`
      );
      // Fallback to precomputed data so graphs remain fully functional
      setResults(getPrecomputedResult(selectedMode));
    }
    setLoading(false);
  };

  const launchSumo = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/launch/${selectedMode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unknown error from API");
      }
    } catch (error: unknown) {
      console.error(error);
      const err = error as Error;
      alert(err.message || "Failed to launch SUMO. Is the API server running?");
    }
  };

  const activeBaselineSchedule =
    results?.baseline_schedule || PRECOMPUTED_SCHEDULES.baseline || [];
  const activeOptimizedSchedule =
    results?.schedule || PRECOMPUTED_SCHEDULES[selectedMode] || [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-3xl">🚌</span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-blue-800 tracking-tight">
                Electric Shuttle Route Optimization
              </h1>
            </div>
            <p className="mt-2 text-slate-600 text-base md:text-lg">
              Thammasat University Rangsit Campus &bull; Metaheuristic Route Optimization &amp; Visual Analytics Dashboard
            </p>
          </div>
          <div className="flex items-center space-x-2 self-start md:self-auto">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              TU Rangsit Simulation Ready
            </span>
          </div>
        </header>

        {/* Controls Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-bold text-slate-700">
              เลือกอัลกอริทึมการค้นหาเส้นทาง (Select Optimization Algorithm)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="w-full sm:w-80 p-2.5 border border-slate-300 rounded-xl shadow-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                value={selectedMode}
                onChange={(e) => handleModeChange(e.target.value)}
              >
                <option value="baseline">Baseline (เส้นทางเดินรถเดิมแบบคงที่ - Fixed Routes)</option>
                <option value="ga">Genetic Algorithm (GA - วิวัฒนาการโครงสร้างสาย)</option>
                <option value="sa">Simulated Annealing (SA - วนซ้ำลดอุณหภูมิค้นหาวงรอบสั้น)</option>
                <option value="pso">Particle Swarm Optimization (PSO - ฝูงอนุภาคปรับความเร็ว)</option>
                <option value="aco">Ant Colony Optimization (ACO - ฟีโรโมนมดค้นหาเส้นทางสั้น)</option>
              </select>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(["ga", "sa", "pso", "aco"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                      selectedMode === mode
                        ? "bg-blue-700 text-white shadow-sm ring-2 ring-blue-300"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500">
              💡 คลิกเลือกอัลกอริทึมเพื่อดูผลลัพธ์และกราฟเปรียบเทียบความแตกต่างได้ทันที หรือกดรันเพื่อจำลองสด
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl disabled:opacity-50 transition shadow-sm flex items-center space-x-2"
            >
              <span>{loading ? "⏳" : "🚀"}</span>
              <span>{loading ? "กำลังคำนวณการจำลอง..." : "Run Live Simulation"}</span>
            </button>
            <button
              onClick={launchSumo}
              disabled={loading || !results}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl disabled:opacity-50 transition shadow-sm flex items-center space-x-2"
            >
              <span>🗺️</span>
              <span>Open SUMO-GUI</span>
            </button>
          </div>
        </div>

        {/* Notice / Error Display */}
        {errorMsg && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-900 text-sm flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <span className="font-bold">สถานะการเชื่อมต่อ: </span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Navigation Tabs for Visual Graphs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("network")}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center space-x-2 whitespace-nowrap transition border-b-2 ${
              activeTab === "network"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <span>🗺️</span>
            <span>Transit Network Graph (โครงข่ายเส้นทาง)</span>
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center space-x-2 whitespace-nowrap transition border-b-2 ${
              activeTab === "metrics"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <span>📊</span>
            <span>Performance Comparison (กราฟเปรียบเทียบ)</span>
          </button>
          <button
            onClick={() => setActiveTab("benchmark")}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center space-x-2 whitespace-nowrap transition border-b-2 ${
              activeTab === "benchmark"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <span>🏆</span>
            <span>All-Algorithms Benchmark (เปรียบเทียบทุกตัว)</span>
          </button>
          <button
            onClick={() => setActiveTab("fleet")}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center space-x-2 whitespace-nowrap transition border-b-2 ${
              activeTab === "fleet"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <span>⏱️</span>
            <span>Route Headway &amp; Fleet (ความถี่และรถ)</span>
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center space-x-2 whitespace-nowrap transition border-b-2 ${
              activeTab === "schedule"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <span>📋</span>
            <span>Route Timetable (ตารางเวลาเทียบท่า)</span>
          </button>
        </div>

        {/* Tab 1: Transit Network Graph (Topological Route Map) */}
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

        {/* Tab 2: Metrics Visual Comparison Charts */}
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

        {/* Tab 3: All Algorithms Benchmark */}
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

        {/* Tab 4: Route Fleet and Headway */}
        {activeTab === "fleet" && (
          <section className="space-y-6">
            <RouteFleetCharts
              baselineSchedule={activeBaselineSchedule}
              optimizedSchedule={activeOptimizedSchedule}
              selectedMode={selectedMode}
            />
          </section>
        )}

        {/* Tab 5: Route Schedule Table Display */}
        {activeTab === "schedule" && activeOptimizedSchedule.length > 0 && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
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
                {activeOptimizedSchedule.length} สาย &bull; รวม 30 คัน
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
                          <span>⏱️ คันแรกถึงป้ายตามเวลาด้านบน และคันถัดไปจะมาถึงทุกๆ</span>
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
              * สามารถกดปุ่ม &quot;Open SUMO-GUI&quot; ด้านบนเพื่อเปิดดูโมเดลจำลองการวิ่งทางกายภาพจริงของรถเมล์ไฟฟ้า
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
