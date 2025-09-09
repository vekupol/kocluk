// src/components/DailyQuestionsChart.tsx
"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Row = { day: string; soru: number };

const data: Row[] = [
  { day: "Pzt", soru: 180 },
  { day: "Sal", soru: 220 },
  { day: "Çar", soru: 160 },
  { day: "Per", soru: 240 },
  { day: "Cum", soru: 200 },
  { day: "Cmt", soru: 140 },
  { day: "Paz", soru: 260 },
];

export default function DailyQuestionsChart() {
  return (
    <div className="h-64 rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 12, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--borderc)" />
          <XAxis dataKey="day" tick={{ fill: "#ffffff", fontSize: 12 }} />
          <YAxis tick={{ fill: "#ffffff", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "var(--chart-tooltip-bg, #674188)",
              border: "1px solid var(--chart-tooltip-border, #C8A1E0)",
              color: "var(--chart-tooltip-text, #ffffff)",
              borderRadius: 8,
              padding: 10,
            }}
            wrapperStyle={{ outline: "none" }}
            labelStyle={{
              color: "var(--chart-tooltip-text, #ffffff)",
              fontWeight: 600,
            }}
          />
          <Line
            type="monotone"
            dataKey="soru"
            stroke="#C8A1E0"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
