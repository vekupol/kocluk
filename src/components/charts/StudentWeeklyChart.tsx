// src/components/charts/StudentWeeklyChart.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { listenAllDays } from "@/lib/dailyStudies";
import type { DayMap } from "@/types/firestore";
import { addDaysISO, formatTR } from "@/lib/program";

type WeeklyPoint = { dayLabel: string; iso: string; questions: number };

function weekdayShortTR(i: number): string {
  return ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][i] ?? "";
}
function sumQuestions(map?: DayMap): number {
  if (!map) return 0;
  let q = 0;
  for (const e of Object.values(map)) {
    if (!e) continue;
    q += e.questions ?? 0;
  }
  return q;
}

export default function StudentWeeklyChart({
  userUid,
  weekStart, // ZORUNLU: Pazartesi ISO (YYYY-MM-DD)
}: {
  userUid: string;
  weekStart: string;
}) {
  const [allDays, setAllDays] = useState<Record<string, DayMap>>({});

  // Firestore dinleyicisi (prev ile shallow karşılaştırma; gereksiz setState engellenir)
  useEffect(() => {
    if (!userUid) return;
    return listenAllDays(userUid, (next) => {
      setAllDays((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every((k) => prev[k] === next[k])
        ) {
          return prev; // aynı referanslar: re-render etme
        }
        return next;
      });
    });
  }, [userUid]);

  // Grafik verisi (türetilmiş)
  const data: WeeklyPoint[] = useMemo(() => {
    const rows: WeeklyPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const iso = addDaysISO(weekStart, i);
      rows.push({
        dayLabel: weekdayShortTR(i),
        iso,
        questions: sumQuestions(allDays[iso]),
      });
    }
    return rows;
  }, [allDays, weekStart]);

  // Tooltip stilleri (stabil referans)
  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: "var(--chart-tooltip-bg)",
      color: "var(--chart-tooltip-text)",
      border: "1px solid var(--chart-tooltip-border)",
      borderRadius: 8,
      padding: 10,
    }),
    []
  );
  const itemStyle = useMemo(() => ({ color: "var(--chart-tooltip-text)" }), []);
  const labelStyle = useMemo(
    () => ({ color: "var(--chart-tooltip-text)", fontWeight: 600 }),
    []
  );

  return (
    <div className="h-56 w-full rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
        >
          {/* Tek mod palete uygun renkler */}
          <CartesianGrid strokeDasharray="3 3" stroke="#E2BFD9" />
          <XAxis dataKey="dayLabel" tick={{ fontSize: 12, fill: "#ffffff" }} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#ffffff" }}
          />
          <Tooltip
            cursor={{ opacity: 0.15 }}
            contentStyle={tooltipStyle}
            itemStyle={itemStyle}
            labelStyle={labelStyle}
            formatter={(v) => [v as number, "Soru"]}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as WeeklyPoint | undefined;
              return p ? `Tarih: ${formatTR(p.iso)}` : "";
            }}
          />
          <Bar
            dataKey="questions"
            barSize={22}
            radius={[8, 8, 0, 0]}
            fill="#C8A1E0"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
