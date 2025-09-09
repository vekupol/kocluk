"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot, getFirestore } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";

export type UserRole = "ogrenci" | "ogretmen" | "unknown";

interface UserDataBlock {
  defaultAccountType?: string;
  accountType?: string;
  role?: string;
}
interface UserDoc {
  defaultAccountType?: string;
  accountType?: string;
  role?: string;
  userData?: UserDataBlock;
}

function normalizeTr(input: string): string {
  // küçük harfe çevir + Türkçe aksanları sadeleştir (ö->o, ğ->g vs.)
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function parseRole(rawIn: string | undefined): UserRole {
  if (!rawIn) return "unknown";
  const raw = normalizeTr(rawIn);
  if (raw.includes("ogrenci")) return "ogrenci";
  if (raw.includes("ogretmen") || raw.includes("egitimkocu")) return "ogretmen"; // eski isimlendirme desteği
  return "unknown";
}

export function useUserRole(): UserRole {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>("unknown");

  useEffect(() => {
    if (!user) {
      setRole("unknown");
      console.log("🔑 [useUserRole] kullanıcı yok → role=unknown");
      return;
    }

    const db = getFirestore();
    const ref = doc(db, "users", user.uid);

    console.log("🔑 [useUserRole] dinlenen belge:", `users/${user.uid}`);

    return onSnapshot(ref, (snap) => {
      const d = snap.data() as UserDoc | undefined;

      // Olası tüm alanları sırayla dene (ilk bulunanı kullan)
      const candidates: Array<{key: string; val?: string}> = [
        { key: "defaultAccountType", val: d?.defaultAccountType },
        { key: "accountType",        val: d?.accountType },
        { key: "role",               val: d?.role },
        { key: "userData.defaultAccountType", val: d?.userData?.defaultAccountType },
        { key: "userData.accountType",        val: d?.userData?.accountType },
        { key: "userData.role",               val: d?.userData?.role },
      ];

      const found = candidates.find(c => (c.val ?? "").trim() !== "");
      const next = parseRole(found?.val);

      console.log("🔑 [useUserRole] okunan alan:", found?.key ?? "(bulunamadı)", "değer:", found?.val ?? "(boş)", "→ role=", next);

      setRole(next);
    });
  }, [user]);

  return role;
}
