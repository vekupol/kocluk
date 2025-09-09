// src/components/GoalProgress.tsx
type Props = { percent: number; label: string };

export default function GoalProgress({ percent, label }: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;

  return (
    <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft transition-shadow hover:shadow-lg">
      <p className="text-sm text-ink/80">{label}</p>
      <div className="mt-3 flex items-center gap-4">
        <svg width={size} height={size} className="shrink-0">
          {/* Arka plan çemberi */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            className="fill-none stroke-borderc"
          />
          {/* İlerleme çemberi */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            className="fill-none stroke-brand"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div>
          <p className="text-3xl font-semibold text-ink">{p}%</p>
          <p className="text-xs text-ink/80">Hedef tamamlama</p>
        </div>
      </div>
    </div>
  );
}
