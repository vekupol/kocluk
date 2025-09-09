// Ortak Firestore tipleri

/** 8. sınıf müfredatı dersleri (örnek, sen genişletebilirsin) */
export type Subject6 =
  | "Türkçe"
  | "Matematik"
  | "Fen Bilimleri"
  | "İngilizce"
  | "Din Kültürü"
  | "İnkılap Tarihi";

/** Günlük çalışma giriş kaydı */
export interface DailyStudyEntry {
  questions: number;
  correct: number;
  wrong: number;
  blank: number;
  minutes: number;
}

/** Belirli bir günün tüm derslerini tutan map */
export type DayMap = Record<Subject6, DailyStudyEntry | undefined>;

/* ------------------------------------------------------------------ */
/* ------------------------- Study Logs ----------------------------- */
/* ------------------------------------------------------------------ */

/** Firestore'a yazarken kullanılacak input */
export type NewStudyLogInput = {
  date: string; // "YYYY-MM-DD"
  subject: string; // ders adı
  questions: number; // çözülen soru
  minutes: number; // harcanan süre (dk)
  notes?: string; // opsiyonel açıklama
};

/** Firestore'dan okunan / UI'de kullanılan satır */
export type StudyLog = {
  id: string; // Firestore document id
  date: string; // "YYYY-MM-DD"
  subject: string;
  questions: number;
  minutes: number;
  notes: string;
  createdAt: number; // timestamp (ms)
};

export interface KoclukDoc {
  uid: string;
  days: Record<string, DayMap>;
}
