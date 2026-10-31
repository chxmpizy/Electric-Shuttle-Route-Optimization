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
      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h3 className="text-[15px] font-semibold text-neutral-900">
          การลู่เข้าของอัลกอริทึม
        </h3>
        <p className="text-[13px] text-neutral-500 mt-2">
          ยังไม่มีประวัติการค้นหา — กด{" "}
          <span className="font-medium text-neutral-800">Run</span>{" "}
          เพื่อเก็บข้อมูลจาก API
        </p>
      </section>
    );
  }

  const W = 760;
  const H = 260;
  const PAD_L = 52;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 40;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const yMin = stats.best;
  const yMax = stats.worst === stats.best ? stats.best + 1 : stats.worst;
  const yRange = yMax - yMin || 1;

  const xStep = history.length > 1 ? innerW / (history.length - 1) : 0;

  const toX = (i: number) => PAD_L + i * xStep;
  const toY = (v: number) => PAD_T + innerH - ((v - yMin) / yRange) * innerH;

  const pathD = history
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(2)} ${toY(v).toFixed(2)}`)
    .join(" ");

  const areaD = `${pathD} L ${toX(history.length - 1).toFixed(2)} ${(
    PAD_T + innerH
  ).toFixed(2)} L ${toX(0).toFixed(2)} ${(PAD_T + innerH).toFixed(2)} Z`;

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

  const improved = stats.improvedPct > 0;

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-neutral-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-900">
              การลู่เข้าของ {algorithm.toUpperCase()}
            </h3>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              ค่าวัตถุประสงค์ (objective) ที่ดีที่สุด ณ แต่ละรอบการค้นหา — ยิ่งต่ำยิ่งดี
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-5 text-[12px]">
            <StatCell label="รอบที่รัน" value={`${stats.iters}`} />
            <StatCell label="เริ่มต้น" value={stats.first.toFixed(3)} />
            <StatCell
              label="ดีที่สุด"
              value={stats.best.toFixed(3)}
              highlight="emerald"
            />
            <StatCell
              label="ปรับปรุง"
              value={`${improved ? "−" : ""}${Math.abs(stats.improvedPct).toFixed(1)}%`}
              highlight={improved ? "emerald" : undefined}
            />
            {typeof elapsedSec === "number" && elapsedSec > 0 && (
              <StatCell label="ใช้เวลา" value={`${elapsedSec.toFixed(2)}s`} />
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 py-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Convergence curve for ${algorithm}`}
        >
          <defs>
            <linearGradient id="convGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Gridlines + Y-labels */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={t.y}
                x2={W - PAD_R}
                y2={t.y}
                stroke="#e5e5e5"
                strokeDasharray="3 4"
              />
              <text
                x={PAD_L - 10}
                y={t.y + 4}
                textAnchor="end"
                fill="#737373"
                fontSize="11"
              >
                {t.v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* X labels */}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={H - PAD_B + 18}
              textAnchor="middle"
              fill="#737373"
              fontSize="11"
            >
              {t.idx}
            </text>
          ))}

          {/* Axis titles */}
          <text
            x={W / 2}
            y={H - 6}
            textAnchor="middle"
            fill="#525252"
            fontSize="11"
            fontWeight="500"
          >
            รอบการค้นหา (iteration)
          </text>
          <text
            x={-H / 2}
            y={16}
            textAnchor="middle"
            transform="rotate(-90)"
            fill="#525252"
            fontSize="11"
            fontWeight="500"
          >
            Objective (ยิ่งต่ำยิ่งดี)
          </text>

          {/* Area */}
          <path d={areaD} fill="url(#convGrad)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* End-point marker */}
          <circle
            cx={toX(history.length - 1)}
            cy={toY(stats.last)}
            r="4"
            fill="#4f46e5"
            stroke="white"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Footer hint */}
      <div className="px-6 py-3 border-t border-neutral-100 text-[12px] text-neutral-500">
        เส้นที่ลาดลงเร็วและนิ่งแปลว่าอัลกอริทึมเจอคำตอบดีได้ไว —
        เทียบกับรอบที่รันและเวลาเพื่อวัดประสิทธิภาพ
      </div>
    </section>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "emerald";
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-neutral-500">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          highlight === "emerald" ? "text-emerald-700" : "text-neutral-900"
        }`}
      >
        {value}
      </span>
    </span>
  );
}
