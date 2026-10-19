"use client";

import React, { useMemo } from "react";

interface ConvergenceChartProps {
  history: number[];
  algorithm: string;
  elapsedSec?: number;
}

export default function ConvergenceChart({
  history,
  algorithm,
  elapsedSec,
}: ConvergenceChartProps) {
  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;
    const best = Math.min(...history);
    const worst = Math.max(...history);
    const first = history[0];
    const last = history[history.length - 1];
    const improvedPct = first > 0 ? ((first - last) / first) * 100 : 0;
    return { best, worst, first, last, improvedPct, iters: history.length };
  }, [history]);

  if (!history || history.length === 0 || !stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          📉 Convergence Curve (เส้นลู่เข้าของอัลกอริทึม)
        </h3>
        <p className="text-sm text-slate-500">
          ยังไม่มีประวัติการค้นหา — กดปุ่ม <span className="font-semibold">Run Live Simulation</span>{" "}
          เพื่อเก็บ history[] จากการเรียก API
        </p>
      </div>
    );
  }

  const W = 720;
  const H = 240;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 32;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const yMin = stats.best;
  const yMax = stats.worst === stats.best ? stats.best + 1 : stats.worst;
  const yRange = yMax - yMin || 1;

  const xStep = history.length > 1 ? innerW / (history.length - 1) : 0;

  const toX = (i: number) => PAD_L + i * xStep;
  const toY = (v: number) =>
    PAD_T + innerH - ((v - yMin) / yRange) * innerH;

  const pathD = history
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(2)} ${toY(v).toFixed(2)}`)
    .join(" ");

  const areaD = `${pathD} L ${toX(history.length - 1).toFixed(2)} ${(PAD_T + innerH).toFixed(2)} L ${toX(0).toFixed(2)} ${(PAD_T + innerH).toFixed(2)} Z`;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = yMin + (yRange * i) / yTicks;
    return { v, y: toY(v) };
  });

  const xTickCount = Math.min(6, history.length);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const idx = Math.round((i / (xTickCount - 1 || 1)) * (history.length - 1));
    return { idx, x: toX(idx) };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            📉 Convergence Curve (เส้นลู่เข้าของ {algorithm.toUpperCase()})
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Best-so-far objective ตามจำนวนรอบการค้นหา — ค่ายิ่งต่ำยิ่งดี
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span>
            <span className="text-slate-500">Iters:</span>{" "}
            <span className="font-bold text-slate-800">{stats.iters}</span>
          </span>
          <span>
            <span className="text-slate-500">Start:</span>{" "}
            <span className="font-bold text-slate-800">{stats.first.toFixed(3)}</span>
          </span>
          <span>
            <span className="text-slate-500">Best:</span>{" "}
            <span className="font-bold text-emerald-700">{stats.best.toFixed(3)}</span>
          </span>
          <span>
            <span className="text-slate-500">Δ:</span>{" "}
            <span
              className={`font-bold ${
                stats.improvedPct > 0 ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              {stats.improvedPct > 0 ? "−" : ""}
              {Math.abs(stats.improvedPct).toFixed(1)}%
            </span>
          </span>
          {typeof elapsedSec === "number" && elapsedSec > 0 && (
            <span>
              <span className="text-slate-500">⏱️</span>{" "}
              <span className="font-bold text-slate-800">{elapsedSec.toFixed(2)}s</span>
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Convergence curve for ${algorithm}`}
      >
        <defs>
          <linearGradient id="convGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Gridlines + Y-axis labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              y1={t.y}
              x2={W - PAD_R}
              y2={t.y}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
            <text
              x={PAD_L - 8}
              y={t.y + 4}
              textAnchor="end"
              className="fill-slate-500"
              fontSize="10"
            >
              {t.v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X-axis labels (iteration index) */}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={H - PAD_B + 16}
            textAnchor="middle"
            className="fill-slate-500"
            fontSize="10"
          >
            {t.idx}
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={W / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-slate-600 font-semibold"
          fontSize="11"
        >
          Iteration
        </text>
        <text
          x={-H / 2}
          y={14}
          textAnchor="middle"
          transform="rotate(-90)"
          className="fill-slate-600 font-semibold"
          fontSize="11"
        >
          Objective (lower = better)
        </text>

        {/* Area fill */}
        <path d={areaD} fill="url(#convGrad)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Final point */}
        <circle
          cx={toX(history.length - 1)}
          cy={toY(stats.last)}
          r="4"
          fill="#2563eb"
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      <p className="text-xs text-slate-500">
        💡 เส้นที่ลู่เข้าสู่ค่าต่ำสุดเร็วและนิ่งหมายถึงอัลกอริทึมค้นเจอคำตอบดีและไม่ขยับต่อ
        — เปรียบเทียบกับ Iters/⏱️ เพื่อประเมิน efficiency
      </p>
    </div>
  );
}
