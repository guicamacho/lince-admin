"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  Landmark,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// PRD-04 §2 modules. The Avenia-verdict relay is handled by the persistent
// pending-approvals banner (not a dedicated menu); approvals land in Empresas.
const NAV = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/orgs", label: "Empresas", icon: Building2 },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/treasury", label: "Tesouraria", icon: Landmark },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-ink-500 bg-ink-800 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-ink-700 text-gold-500" : "text-warm-300 hover:bg-ink-700 hover:text-warm-100",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
