// src/components/layout/Topbar.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInButton from "@/components/auth/SignInButton";
import SignOutButton from "@/components/auth/SignOutButton";
import EmailAuthForm from "@/components/auth/EmailAuthForm";

// ✅ Sidebar'daki gibi Google font
import { Poetsen_One } from "next/font/google";
const poetsen = Poetsen_One({ subsets: ["latin"], weight: "400" });

type Props = { onHamburger: () => void };

export default function Topbar({ onHamburger }: Props) {
  const { user, loading } = useAuth();
  const [showEmail, setShowEmail] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 border-b borderc bg-brand/20 text-ink">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4">
        {/* Hamburger (mobil) */}
        <button
          type="button"
          onClick={onHamburger}
          aria-label="Menüyü aç"
          className="rounded-xl2 border borderc bg-brand/20 p-2 transition-colors hover:bg-brand-300/30 lg:hidden"
        >
          <div className="w-5 space-y-1.5">
            <div className="h-0.5 bg-white" />
            <div className="h-0.5 bg-white" />
            <div className="h-0.5 bg-white" />
          </div>
        </button>

        {/* Brand — Sidebar ile aynı stil */}
        <span
          className={`${poetsen.className} select-none lowercase tracking-wide text-4xl`}
        >
          venüs eğitim
        </span>

        {/* Sağ taraf: auth */}
        <div className="relative ml-auto flex items-center gap-2">
          {!loading &&
            (user ? (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? "Kullanıcı"}
                    className="h-8 w-8 rounded-full border borderc"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-full border borderc bg-brand/20">
                    <span className="text-xs">
                      {(user.email ?? "U").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <SignOutButton />
              </div>
            ) : (
              <>
                <SignInButton />
                <button
                  type="button"
                  onClick={() => setShowEmail((s) => !s)}
                  className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-300/30"
                  aria-expanded={showEmail}
                  aria-controls="email-auth-popover"
                >
                  E-posta ile
                </button>

                {showEmail && (
                  <div
                    id="email-auth-popover"
                    className="absolute right-0 top-12 z-40"
                  >
                    <EmailAuthForm onDone={() => setShowEmail(false)} />
                  </div>
                )}
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
