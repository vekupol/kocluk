// src/components/KpiCard.tsx
type Props = { title: string; value: string; delta?: string; emoji?: string };

export default function KpiCard({ title, value, delta, emoji }: Props) {
  return (
    <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft transition-shadow hover:shadow-lg">
      <div className="flex items-center gap-2">
        {emoji ? (
          <span className="text-lg" aria-hidden>
            {emoji}
          </span>
        ) : null}
        <p className="text-sm text-ink/80">{title}</p>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-ink">{value}</p>
        {delta && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-300">
            +{delta}
          </span>
        )}
      </div>
    </div>
  );
}
