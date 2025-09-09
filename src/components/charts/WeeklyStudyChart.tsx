// src/components/charts/WeeklyStudyChart.tsx
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
import { useAuth } from "@/components/auth/AuthProvider";
import { listenAllDays } from "@/lib/dailyStudies";
import type { DayMap } from "@/types/firestore";

/* ---------- Tipler ---------- */
type WeeklyPoint = { dayLabel: string; iso: string; questions: number };
type WeekOption = {
  id: string;
  startISO: string;
  endISO: string;
  label: string;
};

/* ---------- Yardımcılar ---------- */
function toISODate(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}
function fromISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
function getMonday(isoOrDate: string | Date): Date {
  const d =
    typeof isoOrDate === "string" ? fromISO(isoOrDate) : new Date(isoOrDate);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Pazartesiye çek
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return new Date(m.getFullYear(), m.getMonth(), m.getDate());
}
function addDays(iso: string, delta: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}
function formatTR(iso: string): string {
  const d = fromISO(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function weekdayShortTR(idx: number): string {
  return ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][idx] ?? "";
}
function sumQuestions(map?: DayMap): number {
  if (!map) return 0;
  let q = 0;
  for (const e of Object.values(map)) q += e?.questions ?? 0;
  return q;
}
function buildWeekOptions(
  allDays: Record<string, DayMap>,
  maxWeeks = 12
): WeekOption[] {
  const dates = Object.keys(allDays).sort();
  if (dates.length === 0) {
    const todayISO = toISODate(new Date());
    const start = getMonday(todayISO);
    return Array.from({ length: maxWeeks }).map((_, i) => {
      const startISO = toISODate(
        new Date(start.getFullYear(), start.getMonth(), start.getDate() - i * 7)
      );
      const endISO = addDays(startISO, 6);
      return {
        id: `${startISO}_${endISO}`,
        startISO,
        endISO,
        label: `${formatTR(startISO)} – ${formatTR(endISO)}`,
      };
    });
  }
  const mondaySet = new Set<string>();
  for (const iso of dates) mondaySet.add(toISODate(getMonday(iso)));
  const mondays = Array.from(mondaySet).sort((a, b) => (a < b ? 1 : -1)); // yeni → eski
  return mondays.slice(0, maxWeeks).map((startISO) => {
    const endISO = addDays(startISO, 6);
    return {
      id: `${startISO}_${endISO}`,
      startISO,
      endISO,
      label: `${formatTR(startISO)} – ${formatTR(endISO)}`,
    };
  });
}

/* ---------- Bileşen ---------- */
export default function WeeklyStudyChart() {
  const { user } = useAuth();
  const [allDays, setAllDays] = useState<Record<string, DayMap>>({});
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);

  // Tüm günleri Firestore'dan dinle
  useEffect(() => {
    if (!user) {
      setAllDays({});
      return;
    }
    return listenAllDays(user.uid, setAllDays);
  }, [user]);

  // Hafta seçenekleri
  useEffect(() => {
    const opts = buildWeekOptions(allDays, 12);
    setWeekOptions(opts);
    if (!selectedWeek && opts.length > 0) setSelectedWeek(opts[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDays]);

  // Seçilen haftanın 7 günü
  const data: WeeklyPoint[] = useMemo(() => {
    if (!selectedWeek) return [];
    const { startISO } = selectedWeek;
    return Array.from({ length: 7 }).map((_, i) => {
      const iso = addDays(startISO, i);
      return {
        dayLabel: weekdayShortTR(i),
        iso,
        questions: sumQuestions(allDays[iso]),
      };
    });
  }, [selectedWeek, allDays]);

  if (!user) {
    return (
      <div className="grid h-60 place-items-center rounded-2xl border borderc bg-brand/20 p-4 text-sm text-ink/80">
        Giriş yapın: haftalık soru grafiği için kullanıcı gerekli.
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
      {/* Başlık + Hafta Seçimi */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-sm font-semibold text-ink">
          Haftalık Soru Grafiği (Pzt–Paz)
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink/80">Hafta</label>
          <select
            value={selectedWeek?.id ?? ""}
            onChange={(e) => {
              const next =
                weekOptions.find((w) => w.id === e.target.value) ?? null;
              setSelectedWeek(next);
            }}
            className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm text-ink"
          >
            {weekOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grafik */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2BFD9" />
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 12, fill: "#ffffff" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#ffffff" }}
            />
            <Tooltip
              cursor={{ opacity: 0.15 }}
              contentStyle={{
                backgroundColor: "var(--chart-tooltip-bg)",
                color: "var(--chart-tooltip-text)",
                border: "1px solid var(--chart-tooltip-border)",
                borderRadius: 8,
                padding: 10,
              }}
              itemStyle={{ color: "var(--chart-tooltip-text)" }}
              labelStyle={{
                color: "var(--chart-tooltip-text)",
                fontWeight: 600,
              }}
              formatter={(v) => [v as number, "Soru"]}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { iso?: string } | undefined;
                return p?.iso ? `Tarih: ${formatTR(p.iso)}` : "";
              }}
            />
            <Bar
              dataKey="questions"
              barSize={28}
              radius={[8, 8, 0, 0]}
              fill="#C8A1E0"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alt bilgi: toplam */}
      {selectedWeek && (
        <p className="mt-2 text-xs text-ink/80">
          {formatTR(selectedWeek.startISO)}–{formatTR(selectedWeek.endISO)}{" "}
          haftası toplam soru:{" "}
          <strong>{data.reduce((acc, p) => acc + p.questions, 0)}</strong>
        </p>
      )}
    </div>
  );
}
