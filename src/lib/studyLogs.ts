"use client";
import { useEffect, useState } from "react";
import {
  addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { NewStudyLogInput, StudyLog } from "@/types/firestore";

function tsToMs(ts: unknown): number {
  if (typeof ts === "object" && ts && "toMillis" in ts && typeof (ts as { toMillis: () => number }).toMillis === "function") {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

/** Yeni çalışma kaydı ekle (kullanıcıya ait) */
export async function addStudyLog(input: NewStudyLogInput): Promise<StudyLog> {
  const { db, auth } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Giriş gerekli");

  const ref = collection(db, "study_logs");
  const doc = await addDoc(ref, {
    uid, // ⬅️ sahiplik
    date: input.date,
    subject: input.subject,
    questions: input.questions,
    minutes: input.minutes,
    notes: input.notes ?? "",
    createdAt: serverTimestamp(),
  });
  return { id: doc.id, ...input, createdAt: Date.now() };
}

/** Canlı çalışma listesi: sadece kullanıcıya ait kayıtlar */
export function useStudyLogs(uid: string | null) {
  const { db } = getFirebase();
  const [items, setItems] = useState<StudyLog[]>([]);

  useEffect(() => {
    if (!uid) { setItems([]); return; }
    const q = query(
      collection(db, "study_logs"),
      where("uid", "==", uid),
      orderBy("date", "desc"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: StudyLog[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          date: String(data.date ?? ""),
          subject: String(data.subject ?? "Matematik") as StudyLog["subject"],
          questions: Number(data.questions ?? 0),
          minutes: Number(data.minutes ?? 0),
          notes: typeof data.notes === "string" ? data.notes : "",
          createdAt: tsToMs(data.createdAt),
        };
      });
      setItems(rows);
    });
    return () => unsub();
  }, [db, uid]);

  return { items };
}
