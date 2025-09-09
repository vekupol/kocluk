// src/app/gunluk-program/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";
import {
  mondayISO,
  getStudentWeekProgram,
  updateDailyTasks,
  type WeeklyProgramDoc,
  type DayKey,
  type Task,
} from "@/lib/program";

/* === Yerel tarih yardımcıları === */
function fromISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
function toISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}
function addDaysISO(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function formatTR(iso: string): string {
  const d = fromISO(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function buildRecentMondays(count = 20): string[] {
  const first = mondayISO(new Date());
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = fromISO(first);
    d.setDate(d.getDate() - i * 7);
    out.push(toISO(d));
  }
  return out;
}

/* === Gün sırası & etiketleri === */
const dayOrder: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const dayIndex: Record<DayKey, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};
const dayLabelTR: Record<DayKey, string> = {
  mon: "Pazartesi",
  tue: "Salı",
  wed: "Çarşamba",
  thu: "Perşembe",
  fri: "Cuma",
  sat: "Cumartesi",
  sun: "Pazar",
};

export default function Page() {
  const { user } = useAuth();
  const role = useUserRole();

  // Tek HAFTA seçici
  const [weekStart, setWeekStart] = useState<string>(() =>
    mondayISO(new Date())
  );
  const weekOptions = useMemo(() => buildRecentMondays(20), []);

  const [prog, setProg] = useState<WeeklyProgramDoc | null>(null);
  const [weekTasks, setWeekTasks] = useState<Record<DayKey, Task[]>>({
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  });

  // kirli kontrolü
  const baseJSONRef = useRef<string>(""); // son yüklenen haftanın JSON hali
  const isDirty = useMemo(
    () => JSON.stringify(weekTasks) !== baseJSONRef.current,
    [weekTasks]
  );

  // sayfadan ayrılma/yenile uyarısı
  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty]);

  // Hafta değişince tüm haftalık programı getir
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || role !== "ogrenci") {
        if (!cancelled) {
          setProg(null);
          const empty = {
            mon: [],
            tue: [],
            wed: [],
            thu: [],
            fri: [],
            sat: [],
            sun: [],
          } as Record<DayKey, Task[]>;
          setWeekTasks(empty);
          baseJSONRef.current = JSON.stringify(empty);
        }
        return;
      }
      const p = await getStudentWeekProgram(user.uid, weekStart);
      if (cancelled) return;

      setProg(p);
      const next: Record<DayKey, Task[]> = {
        mon: [...(p?.items?.mon?.tasks ?? [])],
        tue: [...(p?.items?.tue?.tasks ?? [])],
        wed: [...(p?.items?.wed?.tasks ?? [])],
        thu: [...(p?.items?.thu?.tasks ?? [])],
        fri: [...(p?.items?.fri?.tasks ?? [])],
        sat: [...(p?.items?.sat?.tasks ?? [])],
        sun: [...(p?.items?.sun?.tasks ?? [])],
      };
      setWeekTasks(next);
      baseJSONRef.current = JSON.stringify(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, role, weekStart]);

  if (role === "unknown") {
    return <p className="text-sm text-ink/80">Yükleniyor…</p>;
  }
  if (role !== "ogrenci") {
    return (
      <p className="text-sm text-brand-100">Bu sayfa öğrenciler içindir.</p>
    );
  }

  function onChangeWeek(next: string) {
    if (
      isDirty &&
      !window.confirm(
        "Kaydedilmemiş değişiklikler var. Hafta değiştirirseniz kaybolacak. Devam edilsin mi?"
      )
    ) {
      return;
    }
    setWeekStart(next);
  }

  function toggleDone(day: DayKey, idx: number, checked: boolean) {
    const v: 0 | 1 = checked ? 1 : 0;
    setWeekTasks((prev) => ({
      ...prev,
      [day]: prev[day].map((t, i) => (i === idx ? { ...t, done: v } : t)),
    }));
  }

  async function handleSave() {
    if (!user || !prog) return;
    await Promise.all(
      dayOrder.map((d) =>
        updateDailyTasks(prog.teacherUid, user.uid, weekStart, d, weekTasks[d])
      )
    );
    baseJSONRef.current = JSON.stringify(weekTasks); // temiz
  }

  const weekEnd = addDaysISO(weekStart, 6);

  return (
    <section className="space-y-4 text-ink">
      <h1 className="text-lg font-semibold">Günlük Programım</h1>

      {/* Yalnızca HAFTA seçici */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-xs text-ink/80">
            Hafta (Pazartesi)
          </label>
          <select
            value={weekStart}
            onChange={(e) => onChangeWeek(e.target.value)}
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

      {/* Tüm HAFTA — GRID düzeni */}
      {!prog ? (
        <p className="text-sm text-ink/80">
          Bu hafta için atanmış program bulunamadı.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dayOrder.map((d) => {
            const list = weekTasks[d] ?? [];
            const dateISO = addDaysISO(weekStart, dayIndex[d]);
            return (
              <div
                key={d}
                className="flex h-full flex-col rounded-2xl border borderc bg-brand/20 p-3 shadow-soft"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {dayLabelTR[d]} • {formatTR(dateISO)}
                  </span>
                </div>

                {list.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed borderc/60 bg-brand/10 text-xs text-ink/70">
                    Bugün için görev yok.
                  </div>
                ) : (
                  <div className="grow space-y-2">
                    {list.map((t, i) => (
                      <div
                        key={`${d}-${i}`}
                        className="rounded-lg border borderc bg-brand/10 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">
                              {t.subject} • {t.minutes} dk • {t.questions ?? 0}{" "}
                              soru
                            </div>
                            <div className="text-xs text-ink/80">{t.note}</div>
                          </div>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={t.done === 1}
                              onChange={(e) =>
                                toggleDone(d, i, e.target.checked)
                              }
                            />
                            <span className="text-xs">Tamamlandı</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Kaydet */}
      {prog && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="rounded-xl2 border borderc bg-brand px-3 py-2 text-sm font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:translate-y-0 disabled:opacity-60"
          >
            {isDirty ? "Kaydet" : "Kaydedildi"}
          </button>
          {isDirty && (
            <span className="text-xs text-brand-100">
              Kaydedilmemiş değişiklikler var
            </span>
          )}
        </div>
      )}
    </section>
  );
}
