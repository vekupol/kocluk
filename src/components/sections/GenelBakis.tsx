// src/app/page.tsx (veya GenelBakis sayfanın yolu)
"use client";

import { useEffect, useMemo, useState } from "react";
import KpiCard from "@/components/cards/KpiCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { listenAllDays } from "@/lib/dailyStudies";
import type { DayMap } from "@/types/firestore";
import StudentWeeklyChart from "@/components/charts/StudentWeeklyChart";
import {
  getStudentWeekProgram,
  type WeeklyProgramDoc,
  type DayKey,
} from "@/lib/program";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

/* ---------- Yerel tarih yardımcıları (UTC KULLANMA) ---------- */
function fromISOLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function toISOLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function addDaysISO(iso: string, n: number): string {
  const d = fromISOLocal(iso);
  d.setDate(d.getDate() + n);
  return toISOLocal(d);
}
function formatTR(iso: string): string {
  const d = fromISOLocal(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function mondayOf(isoOrDate: string | Date): string {
  const d =
    typeof isoOrDate === "string"
      ? fromISOLocal(isoOrDate)
      : new Date(isoOrDate);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Pazartesiye sar
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return toISOLocal(m);
}
function buildRecentMondays(count = 20): string[] {
  const start = mondayOf(toISOLocal(new Date()));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = fromISOLocal(start);
    d.setDate(d.getDate() - i * 7);
    out.push(toISOLocal(d));
  }
  return out;
}

/* ---------- Haftalık toplama yardımcıları ---------- */
const dayOrder: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function sumDay(map?: DayMap) {
  if (!map) return { questions: 0, minutes: 0 };
  let q = 0,
    m = 0;
  for (const e of Object.values(map)) {
    if (!e) continue;
    q += e.questions ?? 0;
    m += e.minutes ?? 0;
  }
  return { questions: q, minutes: m };
}

export default function GenelBakis() {
  const { user } = useAuth();
  const role = useUserRole();

  // Tek HAFTA seçici (Pazartesi başlangıç)
  const [weekStart, setWeekStart] = useState<string>(() =>
    mondayOf(toISOLocal(new Date()))
  );
  const weekOptions = useMemo(() => buildRecentMondays(20), []);
  const weekEnd = addDaysISO(weekStart, 6);

  // users_daily -> haftalık KPI toplamları
  const [allDays, setAllDays] = useState<Record<string, DayMap>>({});
  useEffect(() => {
    if (!user) {
      setAllDays({});
      return;
    }
    return listenAllDays(user.uid, setAllDays);
  }, [user]);

  const weeklyTotals = useMemo(() => {
    let questions = 0,
      minutes = 0;
    for (let i = 0; i < 7; i++) {
      const iso = addDaysISO(weekStart, i);
      const t = sumDay(allDays[iso]);
      questions += t.questions;
      minutes += t.minutes;
    }
    return { questions, minutes };
  }, [allDays, weekStart]);

  // Öğrenci ise haftalık programdan "tamamlanan / toplam görev" oranı (pasta)
  const [prog, setProg] = useState<WeeklyProgramDoc | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || role !== "ogrenci") {
        if (!cancelled) setProg(null);
        return;
      }
      const p = await getStudentWeekProgram(user.uid, weekStart);
      if (!cancelled) setProg(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, role, weekStart]);

  const { doneCount, totalCount } = useMemo(() => {
    if (!prog) return { doneCount: 0, totalCount: 0 };
    let done = 0,
      total = 0;
    for (const d of dayOrder) {
      const arr = prog.items?.[d]?.tasks ?? [];
      total += arr.length;
      for (const t of arr) if (t.done === 1) done++;
    }
    return { doneCount: done, totalCount: total };
  }, [prog]);

  const pieData =
    totalCount > 0
      ? [
          { name: "Tamamlanan", value: doneCount },
          { name: "Kalan", value: totalCount - doneCount },
        ]
      : [
          { name: "Tamamlanan", value: 0 },
          { name: "Kalan", value: 1 },
        ];
  const ratio = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (!user) {
    return (
      <p className="text-sm text-brand-100">
        Genel bakış için giriş yapmalısın.
      </p>
    );
  }

  return (
    <section className="space-y-6 text-ink">
      <h1 className="text-lg font-semibold">Genel Bakış</h1>
      {/* Hafta seçici (Pazartesi → Pazar) */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-xs text-ink/80">
            Hafta (Pazartesi)
          </label>
          <select
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm"
          >
            {weekOptions.map((iso) => (
              <option key={iso} value={iso}>
                {formatTR(iso)} – {formatTR(addDaysISO(iso, 6))}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:ml-auto text-xs text-ink/80">
          Seçili hafta:{" "}
          <strong>
            {formatTR(weekStart)} – {formatTR(weekEnd)}
          </strong>
        </div>
      </div>

      {/* KPI + Pasta */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">
          <KpiCard
            title="Haftalık Soru"
            value={String(weeklyTotals.questions)}
            emoji="🧠"
          />
          <KpiCard
            title="Haftalık Süre (dk)"
            value={String(weeklyTotals.minutes)}
            emoji="⏱️"
          />
        </div>

        {/* Pasta grafiği: sadece öğrenci hesabında göster */}
        {role === "ogrenci" && (
          <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              Haftalık Görev Tamamlama
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {/* Tamamlanan / Kalan renkleri paletten */}
                    <Cell fill="#C8A1E0" /> {/* brand-300 */}
                    <Cell fill="#E2BFD9" /> {/* brand-200 */}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--chart-tooltip-border)",
                      color: "var(--chart-tooltip-text)",
                      borderRadius: 8,
                      padding: 10,
                    }}
                    wrapperStyle={{ outline: "none" }}
                    labelStyle={{
                      color: "var(--chart-tooltip-text)",
                      fontWeight: 600,
                    }}
                  />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-ink/80">
              Tamamlanan / Toplam:{" "}
              <strong>
                {doneCount} / {totalCount}
              </strong>{" "}
              ({ratio}%)
            </div>
          </div>
        )}
      </div>

      {/* Haftalık soru grafiği (users_daily) */}
      <section className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Haftalık Soru Grafiği
        </h2>
        <StudentWeeklyChart userUid={user.uid} weekStart={weekStart} />
      </section>
    </section>
  );
}
