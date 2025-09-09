// src/app/odevlerim/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";

/** Firestore belgesinin tipli hali (id belgenin kendisinden geliyor) */
export type Assignment = {
  title: string;
  course?: string; // Ders adı
  dueAt?: Timestamp | null; // Teslim tarihi
  status: "pending" | "done";
  note?: string;
  createdAt?: Timestamp | null;
};

/** UI’de kullandığımız satır tipi (id ekli) */
type AssignmentRow = Assignment & { id: string };

type Filter = "all" | "pending" | "done" | "overdue";

const db = getFirestore();

/** Güvenli dönüştürücü – any YOK */
const assignmentConverter: FirestoreDataConverter<Assignment> = {
  toFirestore(a: Assignment): DocumentData {
    return {
      title: a.title,
      course: a.course ?? null,
      dueAt: a.dueAt ?? null,
      status: a.status,
      note: a.note ?? null,
      createdAt: a.createdAt ?? null,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options): Assignment {
    const data = snapshot.data(options) as DocumentData;

    const title =
      typeof data.title === "string" && data.title.trim().length > 0
        ? data.title
        : "Ödev";

    const status: "pending" | "done" =
      data.status === "done" ? "done" : "pending";

    const dueAt =
      data.dueAt instanceof Timestamp ? (data.dueAt as Timestamp) : null;

    const createdAt =
      data.createdAt instanceof Timestamp
        ? (data.createdAt as Timestamp)
        : null;

    const course = typeof data.course === "string" ? data.course : undefined;
    const note = typeof data.note === "string" ? data.note : undefined;

    return { title, course, dueAt, status, note, createdAt };
  },
};

export default function Odevlerim() {
  const { user } = useAuth();
  const [items, setItems] = useState<AssignmentRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [qText, setQText] = useState("");

  // Firestore: Bu öğrencinin ödevleri (studentUid = user.uid)
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    const col = collection(db, "assignments").withConverter(
      assignmentConverter
    );

    let qry;
    try {
      qry = query(
        col,
        where("studentUid", "==", user.uid),
        orderBy("createdAt", "desc")
      );
    } catch (err) {
      console.error("Query kurulamadı:", err);
      setItems([]); // güvenli fallback
      return;
    }

    const unsub = onSnapshot(
      qry,
      (snap) => {
        if (snap.empty) {
          setItems([]);
          return;
        }
        const rows: AssignmentRow[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setItems(rows);
      },
      (err) => {
        console.error("Snapshot hatası:", err);
        setItems([]);
      }
    );

    return () => unsub();
  }, [user]);

  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (qText.trim()) {
        const t = qText.trim().toLowerCase();
        const hay = `${it.title} ${it.course ?? ""} ${
          it.note ?? ""
        }`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      if (filter === "pending") return it.status === "pending";
      if (filter === "done") return it.status === "done";
      if (filter === "overdue") {
        const due = it.dueAt?.toDate?.();
        return it.status !== "done" && !!due && due < now;
      }
      return true;
    });
  }, [items, filter, qText, now]);

  async function toggleStatus(id: string, next: Assignment["status"]) {
    await updateDoc(doc(db, "assignments", id), { status: next });
  }

  function badge(status: Assignment["status"]) {
    return status === "done"
      ? "bg-brand/20 text-ink borderc" // tamamlanan
      : "bg-brand-200/30 text-ink borderc"; // bekleyen
  }

  function dueInfo(a: AssignmentRow) {
    if (!a.dueAt) return { label: "Teslim: —", className: "text-ink/60" };
    const due = a.dueAt.toDate();
    const overdue = a.status !== "done" && due < new Date();
    return {
      label: `Teslim: ${due.toLocaleDateString()}`,
      className: overdue ? "text-brand-100" : "text-ink/70",
    };
  }

  return (
    <section className="space-y-4 text-ink">
      <h1 className="text-lg font-semibold">Ödevlerim</h1>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-ink/80">
            Öğretmenin verdiği ödevleri burada gör ve durumunu güncelle.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Ara: başlık / ders / not…"
            className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm placeholder:text-ink/70"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-xl2 border borderc bg-brand/20 px-3 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            <option value="pending">Bekleyen</option>
            <option value="done">Tamamlanan</option>
            <option value="overdue">Geciken</option>
          </select>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border borderc bg-brand/20 shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-brand/10 text-ink/80">
            <tr>
              <th className="p-3 text-left">Başlık</th>
              <th className="p-3 text-left">Ders</th>
              <th className="p-3 text-left">Durum</th>
              <th className="p-3 text-left">Teslim</th>
              <th className="p-3 text-left">Not</th>
              <th className="p-3 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-brand/10">
            {filtered.map((a) => {
              const due = dueInfo(a);
              return (
                <tr key={a.id} className="border-t borderc">
                  <td className="p-3 font-medium">{a.title}</td>
                  <td className="p-3">{a.course || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${badge(
                        a.status
                      )}`}
                    >
                      {a.status === "done" ? "Tamamlandı" : "Bekliyor"}
                    </span>
                  </td>
                  <td className={`p-3 ${due.className}`}>{due.label}</td>
                  <td className="p-3 text-ink/70">{a.note || "—"}</td>
                  <td className="p-3 text-right">
                    {a.status === "done" ? (
                      <button
                        onClick={() => toggleStatus(a.id, "pending")}
                        className="rounded-xl2 border borderc bg-brand/20 px-3 py-1 text-xs transition-colors hover:bg-brand-200"
                      >
                        Geri Al
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleStatus(a.id, "done")}
                        className="rounded-xl2 border borderc bg-brand px-3 py-1 text-xs text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:translate-y-0"
                      >
                        Tamamla
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-ink/80">
                  Gösterilecek ödev yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!user && (
        <p className="text-xs text-brand-100">
          Ödevlerini görmek için giriş yapmalısın.
        </p>
      )}
    </section>
  );
}
