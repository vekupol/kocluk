// src/app/egitim-kocum/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/components/auth/AuthProvider";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { getUserLite, type UserPublic } from "@/lib/kocluk";

export default function Page() {
  const role = useUserRole(); // hook'lar her zaman üstte
  const { user } = useAuth();
  const { db } = getFirebase();

  const [coach, setCoach] = useState<UserPublic | null>(null);

  useEffect(() => {
    if (!user || role !== "ogrenci") {
      setCoach(null);
      return;
    }
    const ref = doc(db, "users", user.uid);
    return onSnapshot(ref, async (snap) => {
      const data = snap.data() as { egitimKocum?: string[] } | undefined;
      const coachUid = data?.egitimKocum?.[0];
      if (!coachUid) {
        setCoach(null);
        return;
      }
      const u = await getUserLite(coachUid);
      setCoach(u);
    });
  }, [user, role, db]);

  // KOŞULLU RENDER
  if (role === "unknown") {
    return <p className="text-sm text-ink/80">Yükleniyor…</p>;
  }
  if (role !== "ogrenci") {
    return (
      <p className="text-sm text-brand-100">Bu sayfa öğrenciler içindir.</p>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold text-ink">Eğitim Koçum</h1>
      {coach ? (
        <div className="rounded-2xl border borderc bg-brand/20 p-4 shadow-soft">
          <p className="text-sm text-ink/80">Koçunuz:</p>
          <p className="text-base font-medium text-ink">{coach.displayName}</p>
          <p className="text-xs text-ink/70">{coach.email}</p>
        </div>
      ) : (
        <p className="text-sm text-ink/80">Henüz atanmış bir koç görünmüyor.</p>
      )}
    </section>
  );
}
