// src/components/auth/SignOutButton.tsx
"use client";
import { useAuth } from "./AuthProvider";

export default function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-300/30"
    >
      Çıkış Yap
    </button>
  );
}
