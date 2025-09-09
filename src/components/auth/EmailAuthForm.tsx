// src/components/auth/EmailAuthForm.tsx
"use client";
import { useState, ChangeEvent, FormEvent } from "react";
import { useAuth } from "./AuthProvider";

type Mode = "signin" | "signup" | "reset";

export default function EmailAuthForm({ onDone }: { onDone?: () => void }) {
  const { signInEmail, signUpEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  function onEmail(e: ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
  }
  function onPass(e: ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (mode === "signin") {
        await signInEmail(email, password);
        onDone?.();
      } else if (mode === "signup") {
        if (password.length < 6)
          throw new Error("Şifre en az 6 karakter olmalı.");
        await signUpEmail(email, password);
        onDone?.();
      } else {
        await resetPassword(email);
        setMsg("Şifre sıfırlama e-postası gönderildi.");
      }
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
      setMsg(text);
    } finally {
      setBusy(false);
    }
  }

  const tabBase =
    "px-2 py-1 rounded-md transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300";
  const tabActive = "bg-brand text-ink";
  const tabIdle = "bg-brand/20 hover:bg-brand-300/30";

  return (
    <div className="w-80 rounded-2xl border borderc bg-brand/20 p-3 shadow-soft">
      {/* Sekmeler */}
      <div className="mb-2 flex items-center gap-2 text-sm">
        <button
          type="button"
          className={`${tabBase} ${mode === "signin" ? tabActive : tabIdle}`}
          onClick={() => setMode("signin")}
          aria-pressed={mode === "signin"}
        >
          Giriş
        </button>
        <button
          type="button"
          className={`${tabBase} ${mode === "signup" ? tabActive : tabIdle}`}
          onClick={() => setMode("signup")}
          aria-pressed={mode === "signup"}
        >
          Kayıt Ol
        </button>
        <button
          type="button"
          className={`${tabBase} ${mode === "reset" ? tabActive : tabIdle}`}
          onClick={() => setMode("reset")}
          aria-pressed={mode === "reset"}
        >
          Şifre Sıfırla
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-2" aria-busy={busy}>
        <input
          type="email"
          required
          value={email}
          onChange={onEmail}
          placeholder="E-posta"
          autoComplete="email"
          className="w-full rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm"
        />
        {mode !== "reset" && (
          <input
            type="password"
            required
            value={password}
            onChange={onPass}
            placeholder="Şifre"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            className="w-full rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm"
          />
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl2 bg-brand px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-300 disabled:opacity-60"
        >
          {mode === "signin"
            ? "Giriş Yap"
            : mode === "signup"
            ? "Kayıt Ol"
            : "Sıfırlama Linki Gönder"}
        </button>

        {msg && <p className="mt-1 text-xs text-brand-100">{msg}</p>}
      </form>
    </div>
  );
}
