"use client";

import React from "react";
import { RouteSchedule } from "@/types/shuttle";

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = Math.round(minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

function IconInfo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth="1.6"
      className={`shrink-0 stroke-current fill-none [stroke-linecap:round] [stroke-linejoin:round] ${className ?? ""}`}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" strokeWidth="2" />
    </svg>
  );
}

interface ScheduleTableProps {
  schedule: RouteSchedule[];
  mode: string;
  footerHint?: string;
}

export default function ScheduleTable({
  schedule,
  mode,
  footerHint = 'กด "SUMO-GUI" ด้านบนเพื่อดูการจำลองการวิ่งจริง',
}: ScheduleTableProps) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-neutral-900">
            ตารางเวลาเทียบท่า — {mode.toUpperCase()}
          </h3>
          <p className="text-[12px] text-neutral-500 mt-0.5">
            ลำดับป้ายจอดและเวลารถคันแรกของแต่ละเส้นทาง
          </p>
        </div>
        <span className="text-[12px] font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
          {schedule.length} สาย
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-neutral-500 bg-neutral-50/50">
              <th className="px-6 py-3 font-medium">สาย</th>
              <th className="px-6 py-3 font-medium">เส้นทางและเวลา</th>
              <th className="px-6 py-3 font-medium text-center">รถ</th>
              <th className="px-6 py-3 font-medium text-center">ความถี่</th>
              <th className="px-6 py-3 font-medium text-center">ช่วงให้บริการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {schedule.map((route, index) => (
              <tr key={index} className="hover:bg-neutral-50/60 transition">
                <td className="px-6 py-4 align-top whitespace-nowrap">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900 text-white text-[12px] font-semibold">
                    {index + 1}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {route.path.map((stop, i) => (
                      <span key={i} className="flex items-center">
                        <span className="flex flex-col items-center bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-[12px] text-neutral-800">{stop}</span>
                          {route.timetable && route.timetable[i] && (
                            <span className="text-[10px] font-semibold text-indigo-600 tabular-nums mt-0.5">
                              {formatTime(route.timetable[i].arrival_time)}
                            </span>
                          )}
                        </span>
                        {i < route.path.length - 1 && (
                          <span className="text-neutral-300 mx-1 text-xs">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-2">
                    คันถัดไปทุก{" "}
                    <span className="font-semibold text-neutral-800 tabular-nums">
                      {route.headway.toFixed(1)} นาที
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-semibold text-neutral-800 tabular-nums">
                  {route.num_bus}
                </td>
                <td className="px-6 py-4 text-center text-neutral-700 tabular-nums">
                  {route.headway.toFixed(1)} นาที
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[12px] text-neutral-700 font-mono tabular-nums">
                    {formatTime(route.startTime)} – {formatTime(route.endTime)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footerHint && (
        <div className="px-6 py-3 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center gap-2">
          <IconInfo className="w-3.5 h-3.5 text-neutral-400" />
          {footerHint}
        </div>
      )}
    </section>
  );
}
