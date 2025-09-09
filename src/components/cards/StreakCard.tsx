// src/components/StreakCard.tsx
import { StreakLevel } from "@/types/dashboard";

type Props = { days: number; level: StreakLevel };

export default function StreakCard({ days, level }: Props) {
  const badge =
    level === "high"
      ? "bg-brand-100 text-brand-300"
      : level === "mid"
      ? "bg-brand-200 text-brand-300"
      : "bg-brand-300 text-ink";

  return (
    <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft transition-shadow hover:shadow-lg">
      <p className="text-sm text-ink/80">Streak (Üst Üste Gün)</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-2xl font-semibold text-ink">{days} gün</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}
        >
          {level === "high" ? "Süper!" : level === "mid" ? "Devam!" : "Hadi!"}
        </span>
      </div>
    </div>
  );
}
