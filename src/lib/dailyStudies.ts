"use client";

import {
  doc,
  setDoc,
  writeBatch,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type {
  DailyStudyEntry,
  DayMap,
  KoclukDoc,
  Subject6,
} from "@/types/firestore";

// UI'da kullanacağımız sabit sıra
export const SUBJECTS6: Subject6[] = [
  "Türkçe",
  "Matematik",
  "Fen Bilimleri",
  "İngilizce",
  "Din Kültürü",
  "İnkılap Tarihi",
];

// YYYY-MM-DD kontrolü
export function asISO(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("Tarih YYYY-MM-DD olmalı.");
  return date;
}

/**
 * Günlük çalışmaları kaydet (overwrite semantiği).
 * kocluk/{uid} dokümanında days.<date>.<subject> alanlarını direkt yazar.
 * - Aynı derse ikinci kez yazılırsa: eskisini tamamen DEĞİŞTİRİR
 */
export async function saveDailyStudies(
  date: string,
  updates: Partial<DayMap> // 🔑 artık sadece gerekli ders(ler)i gönderebilirsin
): Promise<void> {
  const { db, auth } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Giriş gerekli.");

  const day = asISO(date);
  const ref = doc(db, "kocluk", uid);

  // Dokümanı yoksa oluştur
  await setDoc(ref, { uid }, { merge: true });

  // Tek commit ile çok alan güncelle (overwrite)
  const batch = writeBatch(db);
  (Object.entries(updates) as [Subject6, DailyStudyEntry | undefined][])
    .filter(([, v]) => !!v)
    .forEach(([subject, entry]) => {
      batch.update(ref, {
        [`days.${day}.${subject}`]: entry as DailyStudyEntry,
      });
    });
  await batch.commit();
}

/** Bir günün verisini canlı dinle ve DayMap döndür. */
export function listenDayMap(
  uid: string | null,
  date: string,
  onData: (map: DayMap) => void
): () => void {
  if (!uid) return () => {};
  const { db } = getFirebase();
  const day = asISO(date);
  const ref = doc(db, "kocluk", uid);

  return onSnapshot(ref, (snap) => {
    const data = snap.data() as KoclukDoc | undefined;
    const raw = (data?.days?.[day] ?? undefined) as DocumentData | undefined;

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      onData(raw as DayMap);
      return;
    }

    // Eski array formatı varsa geriye uyumluluk
    if (Array.isArray(raw)) {
      const map: Partial<DayMap> = {};
      for (const item of raw) {
        const subj = item?.subject as Subject6 | undefined;
        if (!subj) continue;
        map[subj] = {
          questions: Number(item?.questions ?? 0),
          correct: Number(item?.correct ?? 0),
          wrong: Number(item?.wrong ?? 0),
          blank: Number(item?.blank ?? 0),
          minutes: Number(item?.minutes ?? 0),
        };
      }
      onData(map as DayMap);
      return;
    }

    onData({} as DayMap);
  });
}

/** Tüm günleri canlı dinle (streak / haftalık özetler için) */
export function listenAllDays(
  uid: string | null,
  onData: (days: Record<string, DayMap>) => void
): () => void {
  if (!uid) return () => {};
  const { db } = getFirebase();
  const ref = doc(db, "kocluk", uid);

  return onSnapshot(ref, (snap) => {
    const data = snap.data() as KoclukDoc | undefined;
    const days = (data?.days ?? {}) as Record<string, DayMap>;
    onData(days);
  });
}
