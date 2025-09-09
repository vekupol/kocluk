// src/components/program/WeeklyProgramForm.tsx
"use client";
import { useState } from "react";
import {
  type DayKey,
  type Task,
  makeProgramFromTasks,
  createWeeklyProgram,
  addDaysISO,
  formatTR,
} from "@/lib/program";
import { SUBJECTS6 } from "@/lib/dailyStudies";
import { Plus, Trash2 } from "lucide-react";

const labels = {
  mon: "Pazartesi",
  tue: "Salı",
  wed: "Çarşamba",
  thu: "Perşembe",
  fri: "Cuma",
  sat: "Cumartesi",
  sun: "Pazar",
} satisfies Record<DayKey, string>;

const dayOrder: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

type TaskInput = { subject: string; minutes: number; note: string };

export default function WeeklyProgramForm({
  teacherUid,
  studentUid,
  weekStart,
  onSaved,
}: {
  teacherUid: string;
  studentUid: string;
  weekStart: string;
  onSaved?: () => void;
}) {
  const [rows, setRows] = useState<Record<DayKey, TaskInput[]>>({
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function addRow(d: DayKey) {
    setRows((prev) => ({
      ...prev,
      [d]: [
        ...prev[d],
        { subject: SUBJECTS6[0] ?? "Türkçe", minutes: 30, note: "" },
      ],
    }));
  }
  function removeRow(d: DayKey, idx: number) {
    setRows((prev) => ({ ...prev, [d]: prev[d].filter((_, i) => i !== idx) }));
  }
  function updateRow(d: DayKey, idx: number, patch: Partial<TaskInput>) {
    setRows((prev) => ({
      ...prev,
      [d]: prev[d].map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  }

  async function handleSave() {
    setBusy(true);
    setMsg("");
    try {
      const byDay: Partial<Record<DayKey, Task[]>> = {};
      (Object.keys(rows) as DayKey[]).forEach((d) => {
        byDay[d] = rows[d].map((r) => ({
          subject: r.subject,
          minutes: Math.max(0, Number(r.minutes) || 0),
          note: r.note,
          done: 0,
        }));
      });
      await createWeeklyProgram(
        makeProgramFromTasks(weekStart, teacherUid, studentUid, byDay)
      );
      setMsg("Program kaydedildi.");
      onSaved?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Beklenmeyen hata.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-ink/80">
        Hafta: <strong>{formatTR(weekStart)}</strong> –{" "}
        <strong>{formatTR(addDaysISO(weekStart, 6))}</strong>
      </div>

      <div className="space-y-3">
        {dayOrder.map((d, idx) => (
          <div key={d} className="rounded-xl2 border borderc p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {labels[d]} • {formatTR(addDaysISO(weekStart, idx))}
              </span>
              <button
                type="button"
                onClick={() => addRow(d)}
                className="inline-flex items-center gap-1 rounded-xl2 border borderc bg-brand/20 px-2 py-1 text-xs transition-colors hover:bg-brand-200"
              >
                <Plus className="h-4 w-4" /> Görev Ekle
              </button>
            </div>

            <div className="space-y-2">
              {rows[d].map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 md:grid-cols-[160px_120px_1fr_36px]"
                >
                  <select
                    value={r.subject}
                    onChange={(e) =>
                      updateRow(d, i, { subject: e.target.value })
                    }
                    className="rounded-xl2 border borderc bg-brand/20 px-2 py-1.5 text-sm"
                  >
                    {SUBJECTS6.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={0}
                    value={r.minutes}
                    onChange={(e) =>
                      updateRow(d, i, { minutes: Number(e.target.value) })
                    }
                    placeholder="Süre (dk)"
                    className="rounded-xl2 border borderc bg-brand/20 px-2 py-1.5 text-sm"
                  />

                  <input
                    type="text"
                    value={r.note}
                    onChange={(e) => updateRow(d, i, { note: e.target.value })}
                    placeholder="Açıklama"
                    className="rounded-xl2 border borderc bg-brand/20 px-2 py-1.5 text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => removeRow(d, i)}
                    className="inline-flex items-center justify-center rounded-xl2 border borderc bg-brand/20 transition-colors hover:bg-brand-200"
                    aria-label="Görevi Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={handleSave}
        className="rounded-xl2 border borderc bg-brand px-3 py-2 text-sm font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:translate-y-0 disabled:opacity-60"
      >
        Kaydet
      </button>
      {msg && <p className="text-xs text-brand-100">{msg}</p>}
    </div>
  );
}
