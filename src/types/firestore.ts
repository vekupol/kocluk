// 6 sabit ders
export type Subject6 =
  | "Türkçe"
  | "Matematik"
  | "Fen Bilimleri"
  | "İngilizce"
  | "Din Kültürü"
  | "İnkılap Tarihi";

// Bir ders için günlük giriş
export type DailyStudyEntry = {
  questions: number; // toplam soru
  correct: number;   // doğru
  wrong: number;     // yanlış
  blank: number;     // boş
  minutes: number;   // süre (dk)
};

// Bir günün tüm dersleri (map)
export type DayMap = Partial<Record<Subject6, DailyStudyEntry>>;

// kocluk/{uid} doküman yapısı (özet)
export type KoclukDoc = {
  uid: string;
  days?: Record<string, DayMap>; // "YYYY-MM-DD" -> { Türkçe: {...}, Matematik: {...}, ... }
};
