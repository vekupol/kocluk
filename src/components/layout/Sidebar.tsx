// src/components/layout/Sidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  UserCircle2,
  Users2,
} from "lucide-react";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { Poetsen_One } from "next/font/google";
const poetsen = Poetsen_One({ subsets: ["latin"], weight: "400" });

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
};

const NAV: NavItem[] = [
  { label: "Genel Bakış", href: "/", icon: LayoutDashboard },
  { label: "Çalışmalarım", href: "/calismalarim", icon: ClipboardCheck },
  { label: "Ödevlerim", href: "/odevlerim", icon: ClipboardList },
  { label: "Deneme Takibi", href: "/deneme-takibi", icon: BarChart3 },
  { label: "Kitap Takibi", href: "/kitap-takibi", icon: BookOpenCheck },
  { label: "Raporlar", href: "/raporlar", icon: BarChart3 },
  { label: "Günlük Program", href: "/gunluk-program", icon: CalendarDays },
  {
    label: "Eğitim Koçum",
    href: "/egitim-kocum",
    icon: UserCircle2,
    roles: ["ogrenci"],
  },
  { label: "Öğrencim", href: "/ogrencim", icon: Users2, roles: ["ogretmen"] },
];

type Props = { open: boolean; onClose: () => void };

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const role = useUserRole();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const items = NAV.filter((i) => !i.roles || i.roles.includes(role));

  // Küçük ekranda: open -> içeri gir, kapalı -> dışarı kay
  // Büyük ekranda: HER ZAMAN görünür (lg:translate-x-0)
  const slideClass = open
    ? "translate-x-0"
    : "-translate-x-72 lg:translate-x-0";

  return (
    <>
      <aside
        className={[
          "fixed top-0 left-0 z-40 h-full w-72",
          "border-r borderc shadow-soft text-ink",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-72", // mobilde gizle/göster
          "lg:translate-x-0", // geniş ekranda hep açık
          "bg-[#674188]", // ✅ mor arkaplan (opak)
        ].join(" ")}
      >
        {/* Başlık + kapatma (mobilde görünür) */}
        <div className="flex h-16 items-center justify-between border-b borderc px-4">
          <span className="text-sm font-medium">Menü</span>
          <button
            className="rounded-xl2 border borderc bg-brand/20 p-2 transition-colors hover:bg-brand-300/30 lg:hidden"
            onClick={onClose}
            aria-label="Menüyü kapat"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menü */}
        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-300 text-ink" : "hover:bg-brand-300/30",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
              >
                <span
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    active ? "bg-brand text-ink" : "bg-brand/20",
                  ].join(" ")}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobil overlay (lg: gizli) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
