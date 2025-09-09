"use client";
import WeeklyStudyChart from "@/components/charts/WeeklyStudyChart";

export default function Raporlar() {
  return (
    <section className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
      <h1 className="text-lg font-semibold">Raporlarım</h1>
      <h2 className="mb-3 text-sm font-semibold text-ink">
        Haftalık Soru Grafiği
      </h2>
      <WeeklyStudyChart />
    </section>
  );
}
