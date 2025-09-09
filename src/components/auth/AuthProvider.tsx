// src/components/auth/AuthProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  browserLocalPersistence,
  setPersistence,
  getRedirectResult,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebase } from "@/lib/firebase";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  // Google
  signInGoogle: () => Promise<void>;
  // Email/Password
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Common
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof FirebaseError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth } = getFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Kalıcı oturum + redirect sonucunu yakalama + auth state dinleyici
  useEffect(() => {
    let mounted = true;

    // Auth state listener
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!mounted) return;
      setUser(u);
      setLoading(false);
    });

    // Persistence & redirect sonucu
    (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        try {
          await getRedirectResult(auth);
        } catch {
          // redirect yoksa sorun değil
        }
      } catch {
        // persistence başarısız olabilir (3rd-party cookies vs.) — sessizce geç
      }
    })();

    return () => {
      mounted = false;
      unsub();
    };
  }, [auth]);

  const signInGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      await signInWithPopup(auth, provider);
    } catch {
      // Popup engelliyse redirect'e düş
      await signInWithRedirect(auth, provider);
    }
  }, [auth]);

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: unknown) {
        throw new Error(errorMessage(err, "E-posta girişi başarısız."));
      }
    },
    [auth]
  );

  const signUpEmail = useCallback(
    async (email: string, password: string) => {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (err: unknown) {
        throw new Error(errorMessage(err, "Kayıt başarısız."));
      }
    },
    [auth]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (err: unknown) {
        throw new Error(
          errorMessage(err, "Şifre sıfırlama e-postası gönderilemedi.")
        );
      }
    },
    [auth]
  );

  const signOut = useCallback(async () => {
    try {
      await fbSignOut(auth);
    } catch (err: unknown) {
      throw new Error(errorMessage(err, "Çıkış yapılamadı."));
    }
  }, [auth]);

  const value: AuthCtx = useMemo(
    () => ({
      user,
      loading,
      signInGoogle,
      signInEmail,
      signUpEmail,
      resetPassword,
      signOut,
    }),
    [
      user,
      loading,
      signInGoogle,
      signInEmail,
      signUpEmail,
      resetPassword,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
