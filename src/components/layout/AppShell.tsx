"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Sağ taraf (Topbar + içerik) */}
      <div className="flex flex-col flex-1 lg:pl-72">
        {/* ✅ lg:pl-72 → büyük ekranda sidebar kadar boşluk bırak */}
        <Topbar onHamburger={() => setOpen((s) => !s)} />
        <main className="pt-5 p-4 lg:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
