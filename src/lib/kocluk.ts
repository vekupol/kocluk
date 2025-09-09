import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  writeBatch,
  arrayUnion,
  FirestoreDataConverter,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

export type UserRole = "ogrenci" | "ogretmen" | "unknown";

export interface UserDoc {
  defaultAccountType?: string;
  accountType?: string;
  role?: string;
  displayName?: string;
  email?: string;
  userData?: {
    defaultAccountType?: string;
    accountType?: string;
    role?: string;
    displayName?: string;
    email?: string;
  };
  // ilişki alanları:
  koclukOgrencilerim?: string[]; // öğretmen tarafı
  egitimKocum?: string[];        // öğrenci tarafı
}

export interface UserPublic {
  uid: string;
  displayName: string;
  email: string;
}

/** Dokümandan displayName/email’i güvenli okur (root ya da userData içinden). */
function extractPublic(uid: string, d: UserDoc | undefined): UserPublic | null {
  if (!d) return null;
  const displayName =
    d.displayName ?? d.userData?.displayName ?? "(isimsiz)";
  const email = d.email ?? d.userData?.email ?? "";
  return { uid, displayName, email };
}

/** E-posta ile kullanıcıyı arar (root.email veya userData.email). */
export async function findUserByEmail(email: string): Promise<UserPublic | null> {
  const { db } = getFirebase();
  const usersCol = collection(db, "users");

  // userData.email
  const q1 = query(usersCol, where("userData.email", "==", email), limit(1));
  const s1 = await getDocs(q1);
  if (!s1.empty) {
    const docSnap = s1.docs[0];
    return extractPublic(docSnap.id, docSnap.data() as UserDoc);
  }

  // root.email
  const q2 = query(usersCol, where("email", "==", email), limit(1));
  const s2 = await getDocs(q2);
  if (!s2.empty) {
    const docSnap = s2.docs[0];
    return extractPublic(docSnap.id, docSnap.data() as UserDoc);
  }

  return null;
}

/** UID ile kullanıcıyı getirir (displayName/email). */
export async function getUserLite(uid: string): Promise<UserPublic | null> {
  const { db } = getFirebase();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return extractPublic(uid, snap.data() as UserDoc);
}

/** İki yönlü ilişki: öğretmen docs → koclukOgrencilerim[], öğrenci docs → egitimKocum[] */
export async function linkCoachAndStudent(teacherUid: string, studentUid: string): Promise<void> {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  const tRef = doc(db, "users", teacherUid);
  const sRef = doc(db, "users", studentUid);

  // Alan yoksa da sorun olmasın diye merge set kullanıyoruz
  batch.set(tRef, { koclukOgrencilerim: arrayUnion(studentUid) }, { merge: true });
  batch.set(sRef, { egitimKocum: arrayUnion(teacherUid) }, { merge: true });

  await batch.commit();
}
