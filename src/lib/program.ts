import {
  writeBatch,
  doc,
  getDocs,
  collection,
  where,
  query,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { Subject6 } from "@/types/firestore";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Task {
  subject: Subject6 | string; // ders
  minutes: number; // süre (dk)
  questions: number; // ← EKLENDİ: soru sayısı
  note: string; // açıklama
  done: 0 | 1; // onay
}
export interface DayPlan {
  tasks: Task[];
}

export interface WeeklyProgramDoc {
  weekStartISO: string; // Pazartesi (YYYY-MM-DD, yerel)
  teacherUid: string;
  studentUid: string;
  items: Record<DayKey, DayPlan>;
  createdAt?: number;
}

/* -------------------- Yerel tarih yardımcıları -------------------- */
export function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}
export function addDaysISO(iso: string, n: number): string {
  const dt = parseISODateLocal(iso);
  dt.setDate(dt.getDate() + n);
  return toISODateLocal(dt);
}
export function mondayISO(d: Date | string): string {
  const base = typeof d === "string" ? parseISODateLocal(d) : new Date(d);
  base.setHours(0, 0, 0, 0);
  const diff = (base.getDay() + 6) % 7; // Mon→0 ... Sun→6
  const mon = new Date(base);
  mon.setDate(base.getDate() - diff);
  return toISODateLocal(mon);
}
export function todayDayKey(date: Date = new Date()): DayKey {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
    date.getDay()
  ] as DayKey;
}
export function formatTR(iso: string): string {
  const d = parseISODateLocal(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/* ---------------- oluşturma & güncelleme ---------------- */
export function makeProgramFromTasks(
  weekStartISO: string,
  teacherUid: string,
  studentUid: string,
  byDay: Partial<Record<DayKey, Task[]>>
): WeeklyProgramDoc {
  const days: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const items = Object.fromEntries(
    days.map((d) => [
      d,
      {
        tasks: (byDay[d] ?? []).map((t) => ({
          ...t,
          questions: t.questions ?? 0,
          done: 0 as const,
        })),
      },
    ])
  ) as Record<DayKey, DayPlan>;
  return { weekStartISO, teacherUid, studentUid, items, createdAt: Date.now() };
}

/** upsert (varsa komple günceller, yoksa oluşturur) — iki tarafa da yazar */
export async function saveWeeklyProgram(
  docIn: WeeklyProgramDoc
): Promise<void> {
  const { db } = getFirebase();
  const { teacherUid, studentUid, weekStartISO } = docIn;
  const batch = writeBatch(db);
  batch.set(
    doc(
      db,
      "users",
      teacherUid,
      "haftalikProgram",
      `${studentUid}_${weekStartISO}`
    ),
    docIn,
    { merge: false }
  );
  batch.set(
    doc(
      db,
      "users",
      studentUid,
      "haftalikProgram",
      `${teacherUid}_${weekStartISO}`
    ),
    docIn,
    { merge: false }
  );
  await batch.commit();
}

/** Öğrencinin gün tasks[] dizisini (done dahil) günceller; iki tarafa da yazar. */
export async function updateDailyTasks(
  teacherUid: string,
  studentUid: string,
  weekStartISO: string,
  day: DayKey,
  tasks: Task[]
): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  const patch = { items: { [day]: { tasks } } };
  batch.set(
    doc(
      db,
      "users",
      teacherUid,
      "haftalikProgram",
      `${studentUid}_${weekStartISO}`
    ),
    patch,
    { merge: true }
  );
  batch.set(
    doc(
      db,
      "users",
      studentUid,
      "haftalikProgram",
      `${teacherUid}_${weekStartISO}`
    ),
    patch,
    { merge: true }
  );
  await batch.commit();
}

/** Öğrenci tarafında bu haftanın programını getir (ilk bulunan). */
export async function getStudentWeekProgram(
  studentUid: string,
  weekStartISO: string
): Promise<WeeklyProgramDoc | null> {
  const { db } = getFirebase();
  const col = collection(db, "users", studentUid, "haftalikProgram");
  const q = query(col, where("weekStartISO", "==", weekStartISO));
  const snaps = await getDocs(q);
  if (snaps.empty) return null;
  return snaps.docs[0].data() as WeeklyProgramDoc;
}

/* --------------------- istatistik (tolerant) --------------------- */
export function calcStats(prog: WeeklyProgramDoc) {
  const bySubject = new Map<string, number>();
  let total = 0;
  for (const day of Object.values(prog.items) as Array<{ tasks?: Task[] }>) {
    const tasks = Array.isArray(day.tasks) ? day.tasks : [];
    for (const t of tasks) {
      if (!t) continue;
      if (t.done === 1) {
        const minutes = Number.isFinite(t.minutes) ? Math.max(0, t.minutes) : 0;
        total += minutes;
        const key = String(t.subject);
        bySubject.set(key, (bySubject.get(key) ?? 0) + minutes);
      }
    }
  }
  return {
    totalMinutes: total,
    bySubject: Array.from(bySubject.entries()).map(([subject, minutes]) => ({
      subject,
      minutes,
    })),
  };
}
