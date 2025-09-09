export type StreakLevel = "low" | "mid" | "high";

export type DailyPoint = {
  day: string;   // "Pzt", "Sal"...
  soru: number;  // gün bazlı soru adedi
  dk: number;    // çalışma dakikası
};

export type PersonalSummary = {
  todayQuestions: number;
  weeklyMinutes: number;
  tasksCompleted: number;
  avgSessionMin: number;
  streakDays: number;
  streakLevel: StreakLevel;
  goalProgressPct: number; // 0-100
};
