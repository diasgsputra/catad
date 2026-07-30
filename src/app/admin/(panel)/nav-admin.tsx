"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const MENU = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/toko", label: "Toko" },
  { href: "/admin/keuangan", label: "Keuangan" },
  { href: "/admin/jejak", label: "Jejak" },
  { href: "/admin/pengaturan", label: "Pengaturan" },
] as const;

export function NavAdmin() {
  const jalur = usePathname();

  return (
    <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
      {MENU.map((m) => {
        // "/admin" hanya aktif kalau memang persis di ringkasan; kalau memakai
        // startsWith, menu itu ikut menyala di semua halaman panel.
        const aktif = m.href === "/admin" ? jalur === "/admin" : jalur.startsWith(m.href);

        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={aktif ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-bold transition-colors",
              aktif ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white",
            )}
          >
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
