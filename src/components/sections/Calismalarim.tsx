// src/app/calismalarim/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  SUBJECTS6,
  listenDayMap,
  listenAllDays,
  saveDailyStudies,
} from "@/lib/dailyStudies";
import type { Subject6, DailyStudyEntry, DayMap } from "@/types/firestore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ----------------- Form yardımcıları ----------------- */
type OneForm = {
  questions: number | "";
  correct: number | "";
  wrong: number | "";
  blank: number | "";
  minutes: number | "";
};
function mismatchWarn(r: OneForm) {
  const q = +(r.questions || 0),
    c = +(r.correct || 0),
    w = +(r.wrong || 0),
    b = +(r.blank || 0);
  return q !== 0 && q !== c + w + b;
}
function isAllZero(r: OneForm) {
  const q = +(r.questions || 0),
    c = +(r.correct || 0),
    w = +(r.wrong || 0),
    b = +(r.blank || 0),
    m = +(r.minutes || 0);
  return q === 0 && c === 0 && w === 0 && b === 0 && m === 0;
}

/* ----------------- Tarih yardımcıları (yerel) ----------------- */
type WeekOption = {
  id: string;
  startISO: string;
  endISO: string;
  label: string;
};
type WeeklyPoint = { dayLabel: string; iso: string; questions: number };

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
function addDaysISO(iso: string, delta: number): string {
  const d = fromISOLocal(iso);
  d.setDate(d.getDate() + delta);
  return toISOLocal(d);
}
function getMondayLocal(isoOrDate: string | Date): string {
  const d =
    typeof isoOrDate === "string"
      ? fromISOLocal(isoOrDate)
      : new Date(isoOrDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return toISOLocal(m);
}
function formatTR(iso: string): string {
  const d = fromISOLocal(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function weekdayShortTR(i: number): string {
  return ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][i] ?? "";
}
function sumQuestionsForSubject(
  map: DayMap | undefined,
  subj: Subject6
): number {
  if (!map) return 0;
  const e = map[subj];
  return e?.questions ?? 0;
}
function buildWeekOptions(
  allDays: Record<string, DayMap>,
  maxWeeks = 12
): WeekOption[] {
  const dates = Object.keys(allDays).sort();
  if (dates.length === 0) {
    const startISO = getMondayLocal(toISOLocal(new Date()));
    return Array.from({ length: maxWeeks }).map((_, i) => {
      const s = addDaysISO(startISO, -i * 7);
      const e = addDaysISO(s, 6);
      return {
        id: `${s}_${e}`,
        startISO: s,
        endISO: e,
        label: `${formatTR(s)} – ${formatTR(e)}`,
      };
    });
  }
  const mondays = Array.from(
    new Set(dates.map((iso) => getMondayLocal(iso)))
  ).sort((a, b) => (a < b ? 1 : -1));
  return mondays.slice(0, maxWeeks).map((s) => {
    const e = addDaysISO(s, 6);
    return {
      id: `${s}_${e}`,
      startISO: s,
      endISO: e,
      label: `${formatTR(s)} – ${formatTR(e)}`,
    };
  });
}

/* ----------------- Tek ders formu ----------------- */
function SubjectFormCard({
  subject,
  value,
  onChange,
}: {
  subject: Subject6;
  value: OneForm;
  onChange: (key: keyof OneForm, v: string) => void;
}) {
  const warn = mismatchWarn(value);
  const ip = (key: keyof OneForm) => ({
    value: value[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const v = raw === "" ? "" : String(Math.max(0, Number(raw)));
      onChange(key, v);
    },
    inputMode: "numeric" as const,
    className:
      "w-full rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm",
  });

  return (
    <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
      <h3 className="mb-3 text-sm font-semibold text-ink">
        {subject} • Günlük Giriş
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs text-ink/80">Toplam Soru</label>
          <input type="number" min={0} {...ip("questions")} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink/80">Doğru</label>
          <input type="number" min={0} {...ip("correct")} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink/80">Yanlış</label>
          <input type="number" min={0} {...ip("wrong")} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink/80">Boş</label>
          <input type="number" min={0} {...ip("blank")} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink/80">Süre (dk)</label>
          <input type="number" min={0} {...ip("minutes")} />
        </div>
      </div>
      {warn && (
        <p className="mt-2 text-xs text-brand-100">
          Uyarı: Doğru + Yanlış + Boş toplamı, “Toplam Soru” ile uyuşmuyor.
        </p>
      )}
    </div>
  );
}

/* ============================= ANA BİLEŞEN ============================= */
export default function Calismalarim() {
  const { user } = useAuth();
  const today = useMemo(() => toISOLocal(new Date()), []);
  const [date, setDate] = useState(today);

  // Tek ortak dropdown: Ders
  const [subject, setSubject] = useState<Subject6>("Türkçe");

  // Form state
  const emptyRow: OneForm = {
    questions: "",
    correct: "",
    wrong: "",
    blank: "",
    minutes: "",
  };
  const [form, setForm] = useState<OneForm>(emptyRow);

  // Grafik için tüm günler
  const [allDays, setAllDays] = useState<Record<string, DayMap>>({});
  useEffect(
    () =>
      user ? listenAllDays(user.uid, setAllDays) : (setAllDays({}), undefined),
    [user]
  );

  // Seçili tarih + ders için formu doldur
  useEffect(() => {
    if (!user) {
      setForm(emptyRow);
      return;
    }
    return listenDayMap(user.uid, date, (map) => {
      const e = map?.[subject];
      setForm(
        e
          ? {
              questions: e.questions,
              correct: e.correct,
              wrong: e.wrong,
              blank: e.blank,
              minutes: e.minutes,
            }
          : emptyRow
      );
    });
  }, [user, date, subject]);

  function setField(key: keyof OneForm, value: string) {
    const v = value === "" ? "" : Math.max(0, Number(value));
    setForm((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSave() {
    if (!user) return;
    if (isAllZero(form)) return;

    // 🔧 Burada Partial<DayMap> kullan
    const updates: Partial<DayMap> = {
      [subject]: {
        questions: Number(form.questions || 0),
        correct: Number(form.correct || 0),
        wrong: Number(form.wrong || 0),
        blank: Number(form.blank || 0),
        minutes: Number(form.minutes || 0),
      },
    };

    await saveDailyStudies(date, updates);
  }

  // Haftalık grafik verisi
  const weekOptions = useMemo(() => buildWeekOptions(allDays, 12), [allDays]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>(
    weekOptions[0]?.id ?? ""
  );
  useEffect(() => {
    if (weekOptions.length > 0) setSelectedWeekId(weekOptions[0].id);
  }, [weekOptions]);

  const selectedWeek = useMemo(
    () => weekOptions.find((w) => w.id === selectedWeekId) ?? null,
    [selectedWeekId, weekOptions]
  );
  const weeklyData: WeeklyPoint[] = useMemo(() => {
    if (!selectedWeek) return [];
    return Array.from({ length: 7 }).map((_, i) => {
      const iso = addDaysISO(selectedWeek.startISO, i);
      return {
        dayLabel: weekdayShortTR(i),
        iso,
        questions: sumQuestionsForSubject(allDays[iso], subject),
      };
    });
  }, [selectedWeek, allDays, subject]);
  const weeklyTotal = weeklyData.reduce((acc, p) => acc + p.questions, 0);

  // Özet (seçili ders + gün)
  const todayTotals = useMemo(() => {
    const m = allDays[date];
    const e = m?.[subject];
    return { q: e?.questions ?? 0, min: e?.minutes ?? 0 };
  }, [allDays, date, subject]);

  return (
    <section className="space-y-6 rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
      <h1 className="text-lg font-semibold">Çalışmalarım</h1>
      {/* 1) Üst: Tarih + Ders yan yana */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-xs text-ink/80">Tarih</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink/80">Ders</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject6)}
            className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm"
          >
            {SUBJECTS6.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2) Form */}
      <SubjectFormCard
        subject={subject}
        value={form}
        onChange={(k, v) => setField(k, v)}
      />

      {/* 3) Kaydet butonu (hover + focus) */}
      <div>
        <button
          onClick={handleSave}
          className="inline-flex h-10 items-center justify-center rounded-xl2 border borderc bg-brand px-4 text-sm font-medium text-ink transition-all duration-200 hover:bg-brand-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:translate-y-0 disabled:opacity-60"
          disabled={!user}
          title={user ? "Kaydet" : "Önce giriş yap"}
        >
          Kaydet
        </button>
      </div>

      {/* 4) Özet */}
      <div className="rounded-xl2 border borderc bg-brand/20 p-3 text-xs text-ink/90">
        <span className="mr-3">
          {formatTR(date)} • <strong>{subject}</strong>
        </span>
        <span className="mr-3">
          Soru: <strong>{todayTotals.q}</strong>
        </span>
        <span>
          Süre: <strong>{todayTotals.min} dk</strong>
        </span>
      </div>

      {/* 5) Grafik */}
      <div className="rounded-2xl border borderc bg-brand p-4 shadow-soft">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-sm font-semibold text-ink">
            {subject} • Haftalık Soru (Pzt–Paz)
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink/80">Hafta</label>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm"
            >
              {weekOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyData}
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
                  const p = payload?.[0]?.payload as WeeklyPoint | undefined;
                  return p ? `Tarih: ${formatTR(p.iso)}` : "";
                }}
              />
              <Bar
                dataKey="questions"
                barSize={24}
                radius={[8, 8, 0, 0]}
                fill="#C8A1E0"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {selectedWeek && (
          <p className="mt-2 text-xs text-ink/80">
            {formatTR(selectedWeek.startISO)}–{formatTR(selectedWeek.endISO)}{" "}
            haftası ({subject}) toplam soru: <strong>{weeklyTotal}</strong>
          </p>
        )}
      </div>
    </section>
  );
}
