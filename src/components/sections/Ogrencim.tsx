// src/app/ogrencim/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import {
  findUserByEmail,
  getUserLite,
  linkCoachAndStudent,
  type UserPublic,
} from "@/lib/kocluk";
import {
  mondayISO,
  addDaysISO,
  formatTR,
  toISODateLocal,
  parseISODateLocal,
  saveWeeklyProgram,
  calcStats,
  type WeeklyProgramDoc,
  type DayKey,
  type Task,
} from "@/lib/program";
import { SUBJECTS6 } from "@/lib/dailyStudies";
import StudentWeeklyChart from "@/components/charts/StudentWeeklyChart";
import { Plus, Trash2 } from "lucide-react";

/* yardımcılar */
const dayOrder: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const dayLabel: Record<DayKey, string> = {
  mon: "Pazartesi",
  tue: "Salı",
  wed: "Çarşamba",
  thu: "Perşembe",
  fri: "Cuma",
  sat: "Cumartesi",
  sun: "Pazar",
};
function buildRecentMondays(count = 20): string[] {
  const todayMon = mondayISO(new Date());
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = parseISODateLocal(todayMon);
    d.setDate(d.getDate() - i * 7);
    out.push(toISODateLocal(d));
  }
  return out;
}

/* --------------------------- Sayfa --------------------------- */
export default function Page() {
  const role = useUserRole();
  const { user } = useAuth();
  const { db } = getFirebase();

  // Tek hafta seçici (tüm sayfa)
  const [weekStart, setWeekStart] = useState<string>(() =>
    mondayISO(new Date())
  );
  const weekOptions = useMemo(() => buildRecentMondays(20), []);

  // Öğrenci listesi
  const [studentUids, setStudentUids] = useState<string[]>([]);
  const [students, setStudents] = useState<UserPublic[]>([]);

  // “Kaydedilmemiş değişiklik” takibi (öğrenci bazında)
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const hasDirty = useMemo(
    () => Object.values(dirtyMap).some(Boolean),
    [dirtyMap]
  );

  useEffect(() => {
    if (!user || role !== "ogretmen") {
      setStudentUids([]);
      return;
    }
    const ref = doc(db, "users", user.uid);
    return onSnapshot(ref, (snap) => {
      const data = snap.data() as { koclukOgrencilerim?: string[] } | undefined;
      setStudentUids(data?.koclukOgrencilerim ?? []);
    });
  }, [user, role, db]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const arr: UserPublic[] = [];
      for (const uid of studentUids) {
        const u = await getUserLite(uid);
        if (u) arr.push(u);
      }
      if (!cancelled) setStudents(arr);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentUids]);

  // sayfadan ayrılmaya çalışırsa (yenile/kapama) uyar
  useEffect(() => {
    if (!hasDirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [hasDirty]);

  function onWeekChange(next: string) {
    if (
      hasDirty &&
      !window.confirm(
        "Kaydedilmemiş değişiklikler var. Hafta değiştirirseniz kaybolacak. Devam edilsin mi?"
      )
    ) {
      return;
    }
    setWeekStart(next);
  }

  // onDirtyChange’i stabilize et
  const handleDirtyChange = useCallback((uid: string, dirty: boolean) => {
    setDirtyMap((prev) => {
      if (prev[uid] === dirty) return prev;
      return { ...prev, [uid]: dirty };
    });
  }, []);

  // Öğrenci ekleme (sayfanın sonunda)
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function handleAdd() {
    if (!user || role !== "ogretmen" || !email) return;
    setBusy(true);
    setMsg("");
    try {
      const s = await findUserByEmail(email.trim());
      if (!s) return setMsg("Bu e-posta ile kayıtlı öğrenci bulunamadı.");
      if (s.uid === user.uid)
        return setMsg("Kendinizi öğrenci olarak ekleyemezsiniz.");
      if (studentUids.includes(s.uid))
        return setMsg("Bu öğrenci zaten listenizde.");
      await linkCoachAndStudent(user.uid, s.uid);
      setMsg(`Eklendi: ${s.displayName}`);
      setEmail("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Beklenmeyen hata.");
    } finally {
      setBusy(false);
    }
  }

  if (role === "unknown")
    return <p className="text-sm text-ink/80">Yükleniyor…</p>;
  if (role !== "ogretmen")
    return (
      <p className="text-sm text-brand-100">Bu sayfa öğretmenler içindir.</p>
    );

  return (
    <section className="space-y-6 text-ink">
      <h1 className="text-lg font-semibold">Öğrencim</h1>

      {/* Tek hafta seçici */}
      <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
        <label className="mb-1 block text-xs text-ink/80">
          Hafta (Pazartesi)
        </label>
        <select
          value={weekStart}
          onChange={(e) => onWeekChange(e.target.value)}
          className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm"
        >
          {weekOptions.map((iso) => (
            <option key={iso} value={iso}>
              {formatTR(iso)} – {formatTR(addDaysISO(iso, 6))}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink/70">
          Tüm içerik bu haftaya göre gösterilir ve kaydedilir.
        </p>
      </div>

      {/* Öğrenci kartları */}
      <div className="space-y-4">
        {students.map((s) => (
          <StudentCard
            key={s.uid}
            teacherUid={user!.uid}
            student={s}
            weekStart={weekStart}
            onDirtyChange={handleDirtyChange}
          />
        ))}
        {students.length === 0 && (
          <p className="text-sm text-ink/80">Henüz öğrenci eklemediniz.</p>
        )}
      </div>

      {/* Öğrenci ekleme — en sonda */}
      <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
        <h2 className="mb-2 text-sm font-semibold">Öğrenci Ekle</h2>
        <label className="mb-1 block text-xs text-ink/80">E-posta</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ogrenci@ornek.com"
            className="flex-1 rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm placeholder:text-ink/70"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !email}
            className="rounded-xl2 border borderc bg-brand px-3 py-2 text-sm font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:translate-y-0 disabled:opacity-60"
          >
            Ekle
          </button>
        </div>
        {msg && <p className="mt-2 text-xs text-brand-100">{msg}</p>}
      </div>
    </section>
  );
}

/* ----------------------- Öğrenci Kartı ----------------------- */
function StudentCard({
  teacherUid,
  student,
  weekStart,
  onDirtyChange,
}: {
  teacherUid: string;
  student: UserPublic;
  weekStart: string;
  onDirtyChange: (uid: string, dirty: boolean) => void;
}) {
  const { db } = getFirebase();

  const [prog, setProg] = useState<WeeklyProgramDoc | null>(null);
  const [draft, setDraft] = useState<Record<DayKey, Task[]>>({
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  });

  // Firestore'daki haftalık dokümanı dinle
  useEffect(() => {
    const ref = doc(
      db,
      "users",
      teacherUid,
      "haftalikProgram",
      `${student.uid}_${weekStart}`
    );
    return onSnapshot(ref, (snap) => {
      const data = snap.exists() ? (snap.data() as WeeklyProgramDoc) : null;
      setProg(data);
    });
  }, [db, teacherUid, student.uid, weekStart]);

  // prog geldiğinde, eğer kirli değilsek draft'ı senkronla
  const lastProgJSON = useRef<string>("");
  const baseFromProg = useMemo(() => {
    const out: Record<DayKey, Task[]> = {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    };
    if (prog?.items) {
      for (const d of dayOrder) {
        const arr = prog.items[d]?.tasks ?? [];
        out[d] = Array.isArray(arr) ? [...arr] : [];
      }
    }
    return out;
  }, [prog]);

  const isDirty = useMemo(() => {
    const base = baseFromProg;
    return JSON.stringify(base) !== JSON.stringify(draft);
  }, [baseFromProg, draft]);

  // Parent'a sadece değiştiğinde bildir
  const lastDirtyRef = useRef<boolean>(false);
  useEffect(() => {
    if (lastDirtyRef.current !== isDirty) {
      lastDirtyRef.current = isDirty;
      onDirtyChange(student.uid, isDirty);
    }
  }, [isDirty, student.uid, onDirtyChange]);

  useEffect(() => {
    const baseJSON = JSON.stringify(baseFromProg);
    if (!isDirty || lastProgJSON.current !== baseJSON) {
      setDraft(baseFromProg);
      lastProgJSON.current = baseJSON;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFromProg, weekStart]);

  function addTask(day: DayKey) {
    setDraft((prev) => ({
      ...prev,
      [day]: [
        ...prev[day],
        {
          subject: SUBJECTS6[0] ?? "Türkçe",
          minutes: 30,
          questions: 0,
          note: "",
          done: 0,
        },
      ],
    }));
  }

  function removeTask(day: DayKey, idx: number) {
    setDraft((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }));
  }
  function patchTask(day: DayKey, idx: number, patch: Partial<Task>) {
    setDraft((prev) => ({
      ...prev,
      [day]: prev[day].map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  }

  async function handleSave() {
    const docOut: WeeklyProgramDoc = {
      weekStartISO: weekStart,
      teacherUid,
      studentUid: student.uid,
      items: {
        mon: { tasks: draft.mon },
        tue: { tasks: draft.tue },
        wed: { tasks: draft.wed },
        thu: { tasks: draft.thu },
        fri: { tasks: draft.fri },
        sat: { tasks: draft.sat },
        sun: { tasks: draft.sun },
      },
      createdAt: prog?.createdAt ?? Date.now(),
    };
    await saveWeeklyProgram(docOut);
  }

  const stats = prog
    ? calcStats(prog)
    : {
        totalMinutes: 0,
        bySubject: [] as { subject: string; minutes: number }[],
      };

  return (
    <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{student.displayName}</h3>
          <p className="text-xs text-ink/80">{student.email}</p>
        </div>
        <div className="text-xs text-ink/80">
          Hafta:{" "}
          <strong>
            {formatTR(weekStart)} – {formatTR(addDaysISO(weekStart, 6))}
          </strong>
        </div>
      </div>

      {/* TEK LİSTE: mevcut görevler + ekleme aynı blokta (gün gün) */}
      <div className="space-y-3">
        {dayOrder.map((day, idx) => (
          <div key={day} className="rounded-xl2 border borderc p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {dayLabel[day]} • {formatTR(addDaysISO(weekStart, idx))}
              </span>
              <button
                type="button"
                onClick={() => addTask(day)}
                className="inline-flex items-center gap-1 rounded-xl2 border borderc bg-brand/20 px-2 py-1 text-xs transition-colors hover:bg-brand-200"
              >
                <Plus className="h-4 w-4" /> Görev Ekle
              </button>
            </div>

            {draft[day].length > 0 && (
              <>
                {/* Kolon başlıkları (md+ ekranlarda) */}
                <div className="mb-1 hidden px-1 text-[11px] text-ink/70 md:grid md:grid-cols-[160px_100px_100px_1fr_36px_auto]">
                  <span>Ders</span>
                  <span>Süre (dk)</span>
                  <span>Soru</span>
                  <span>Açıklama</span>
                  <span></span>
                  <span className="justify-self-end">Durum</span>
                </div>

                <div className="space-y-2">
                  {draft[day].map((t, i) => {
                    const statusText =
                      t.done === 1 ? "Görev tamamlandı" : "Görev gönderildi";
                    const statusClass =
                      t.done === 1
                        ? "bg-brand/20 text-ink borderc"
                        : "bg-brand-200/30 text-ink borderc";

                    return (
                      <div
                        key={i}
                        className="grid grid-cols-1 items-center gap-2 md:grid-cols-[160px_100px_100px_1fr_36px_auto]"
                      >
                        {/* Ders */}
                        <select
                          value={t.subject}
                          onChange={(e) =>
                            patchTask(day, i, { subject: e.target.value })
                          }
                          className="rounded-xl2 border borderc bg-brand/20 px-2 py-1.5 text-sm"
                        >
                          {SUBJECTS6.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        {/* Süre (dk) */}
                        <input
                          type="number"
                          min={0}
                          value={t.minutes}
                          onChange={(e) =>
                            patchTask(day, i, {
                              minutes: Number(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl2 border borderc bg-brand/20 px-2 py-1.5 text-sm"
                          placeholder="Süre"
                        />

                        {/* Soru Sayısı */}
                        <input
                          type="number"
                          min={0}
                          value={t.questions ?? 0}
                          onChange={(e) =>
                            patchTask(day, i, {
                              questions: Number(e.target.value) || 0,
                            })
                          }
                          className="rounded-xl2 border borderc bg-brand/20 px-2 py-1.5 text-sm"
                          placeholder="Soru"
                        />

                        {/* Açıklama */}
                        <input
                          type="text"
                          value={t.note}
                          onChange={(e) =>
                            patchTask(day, i, { note: e.target.value })
                          }
                          className="rounded-xl2 border borderc bg-brand/20 px-2 py-1.5 text-sm"
                          placeholder="Açıklama"
                        />

                        {/* Sil */}
                        <button
                          type="button"
                          onClick={() => removeTask(day, i)}
                          className="inline-flex items-center justify-center rounded-xl2 border borderc bg-brand/20 px-2 py-1.5 transition-colors hover:bg-brand-200"
                          aria-label="Görevi Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {/* Durum (salt-okunur) */}
                        <span
                          className={`justify-self-end rounded-full border px-2 py-1 text-[11px] ${statusClass}`}
                          title={statusText}
                        >
                          {statusText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Kaydet / Uyarı */}
      <div className="mt-3 flex items-center gap-3">
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

      {/* mini istatistik + users_daily grafiği */}
      <div className="mt-4 text-xs text-ink/80">
        Bu hafta tamamlanan süre: <strong>{stats.totalMinutes} dk</strong>
      </div>
      <div className="mt-2">
        <StudentWeeklyChart userUid={student.uid} weekStart={weekStart} />
      </div>
    </div>
  );
}
