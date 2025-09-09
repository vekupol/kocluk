// src/components/auth/SignInButton.tsx
"use client";
import { useAuth } from "./AuthProvider";

export default function SignInButton() {
  const { signInGoogle, loading } = useAuth();

  return (
    <button
      type="button"
      onClick={signInGoogle}
      disabled={loading}
      aria-busy={loading}
      className="rounded-xl2 border borderc bg-brand px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-300 disabled:opacity-60"
    >
      Google ile Giriş Yap
    </button>
  );
}
