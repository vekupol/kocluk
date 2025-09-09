// lib/firebase.ts
// 🚫 Sunucu tarafında kullanmayın. Sadece client component'larda import edin.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

export type FirebaseServices = {
  app: FirebaseApp;
  db: Firestore;   // default Firestore DB
  auth: Auth;
  analytics?: Analytics; // opsiyonel (tarayıcı destekliyse)
};

const firebaseConfig = {
  apiKey:        process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:     process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:         process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // GA4
};

let cached: FirebaseServices | null = null;

export function getFirebase(): FirebaseServices {
  if (cached) return cached;

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);   // ✅ default veritabanı
  const auth = getAuth(app);

  // Analytics sadece browser'da ve destek varsa kurulsun
  if (typeof window !== "undefined") {
    void isSupported().then((ok) => {
      if (ok) {
        const analytics = getAnalytics(app);
        cached = { app, db, auth, analytics };
      } else {
        cached = { app, db, auth };
      }
    });
  }

  cached = cached ?? { app, db, auth };
  return cached;
}
