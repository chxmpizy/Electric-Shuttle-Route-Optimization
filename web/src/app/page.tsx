"use client";

import { useState } from "react";

export default function Home() {
  const [selectedMode, setSelectedMode] = useState<string>("baseline");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setResults(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/run/${selectedMode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unknown error from API");
      }
      setResults(data);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Failed to run simulation. Is the API server running?");
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
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to launch SUMO. Is the API server running?");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b pb-6">
          <h1 className="text-4xl font-extrabold text-blue-700 tracking-tight">
            🚌 Electric Shuttle Route Optimization
          </h1>
          <p className="mt-2 text-gray-600 text-lg">
            Thammasat University Rangsit Campus - Metaheuristic Dashboard
          </p>
        </header>

        {/* Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Optimization Algorithm
            </label>
            <select
              className="w-full md:w-1/2 p-2 border rounded-md shadow-sm bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
            >
              <option value="baseline">Baseline (Fixed Routes)</option>
              <option value="ga">Genetic Algorithm (GA)</option>
              <option value="sa">Simulated Annealing (SA)</option>
              <option value="pso">Particle Swarm Optimization (PSO)</option>
              <option value="aco">Ant Colony Optimization (ACO)</option>
            </select>
          </div>
          <div className="ml-6 space-x-4">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition"
            >
              {loading ? "Running Optimization..." : "🚀 Run Analysis"}
            </button>
            <button
              onClick={launchSumo}
              disabled={loading || !results}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 transition"
            >
              🗺️ Open SUMO-GUI
            </button>
          </div>
        </div>

        {/* Error Display */}
        {errorMsg && (
          <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-200 animate-in fade-in">
            <h2 className="text-xl font-bold text-red-800 mb-2">❌ Error</h2>
            <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono bg-red-100 p-4 rounded-md">{errorMsg}</pre>
          </div>
        )}

        {/* Metrics Display */}
        {results && (
          <div className="bg-white p-8 rounded-xl shadow-sm border space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
              📊 Performance Comparison: Baseline vs {selectedMode.toUpperCase()}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Wait Time Metric */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">⏳ Avg Passenger Wait Time</h3>
                <div className="flex justify-between text-gray-700 mb-2">
                  <span>Baseline:</span>
                  <span className="font-medium">{results.baseline_wait.toFixed(2)} mins</span>
                </div>
                <div className="flex justify-between text-blue-800 text-xl font-bold mb-2">
                  <span>Optimized:</span>
                  <span>{results.optimized_wait.toFixed(2)} mins</span>
                </div>
                {(() => {
                  const diff = results.optimized_wait - results.baseline_wait;
                  const pct = (diff / results.baseline_wait) * 100;
                  const isImprovement = diff < 0;
                  return (
                    <div className={`mt-4 pt-4 border-t ${isImprovement ? 'border-green-200 text-green-700' : 'border-red-200 text-red-600'} font-semibold text-right`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)} mins ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                    </div>
                  );
                })()}
              </div>

              {/* Travel Time Metric */}
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">⏱️ Avg Travel Time</h3>
                <div className="flex justify-between text-gray-700 mb-2">
                  <span>Baseline:</span>
                  <span className="font-medium">{results.baseline_travel.toFixed(2)} mins</span>
                </div>
                <div className="flex justify-between text-purple-800 text-xl font-bold mb-2">
                  <span>Optimized:</span>
                  <span>{results.optimized_travel.toFixed(2)} mins</span>
                </div>
                {(() => {
                  const diff = results.optimized_travel - results.baseline_travel;
                  const pct = (diff / results.baseline_travel) * 100;
                  const isImprovement = diff < 0;
                  return (
                    <div className={`mt-4 pt-4 border-t ${isImprovement ? 'border-green-200 text-green-700' : 'border-red-200 text-red-600'} font-semibold text-right`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)} mins ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Schedule Table Display */}
            {results.schedule && results.schedule.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Optimized Route Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse rounded-lg overflow-hidden shadow-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 text-sm uppercase tracking-wider">
                        <th className="p-3 border-b">Route</th>
                        <th className="p-3 border-b">Path (Stops)</th>
                        <th className="p-3 border-b text-center">Buses</th>
                        <th className="p-3 border-b text-center">Headway</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {results.schedule.map((route: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition">
                          <td className="p-3 font-semibold text-gray-800 whitespace-nowrap">Route {index + 1}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 items-center">
                              {route.path.map((stop: string, i: number) => (
                                <span key={i} className="flex items-center">
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded shadow-sm border border-blue-200">
                                    {stop}
                                  </span>
                                  {i < route.path.length - 1 && (
                                    <span className="text-gray-400 mx-1 text-xs">➔</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center font-medium text-gray-700">{route.num_bus}</td>
                          <td className="p-3 text-center text-gray-700">{route.headway.toFixed(1)} mins</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <p className="text-gray-500 text-sm mt-4 text-center">
              * Click 'Open SUMO-GUI' above to visualize the physical route simulation based on these results.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
