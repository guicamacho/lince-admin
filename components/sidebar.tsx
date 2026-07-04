"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Clock,
  CheckCheck,
  ArrowLeftRight,
  Landmark,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MAKER_CHECKER_ENABLED } from "@/lib/flags";

// PRD-04 §2 modules. The Avenia-verdict relay is handled by the persistent pending-approvals
// banner; the maker-checker queue (2ª aprovação) is the dedicated "Aprovações" item, hidden
// until a second ops user exists (see flags.ts).
const NAV = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/orgs", label: "Empresas", icon: Building2 },
  { href: "/admissions", label: "Admissões", icon: Clock },
  { href: "/approvals", label: "Aprovações", icon: CheckCheck, badge: true },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/treasury", label: "Tesouraria", icon: Landmark },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/settings", label: "Configurações", icon: Settings },
].filter((item) => MAKER_CHECKER_ENABLED || item.href !== "/approvals");

export function Sidebar({ approvalsCount = 0 }: { approvalsCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-ink-500 bg-ink-800 p-3">
      {NAV.map(({ href, label, icon: Icon, ...rest }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const showBadge = "badge" in rest && rest.badge && approvalsCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-ink-700 text-gold-500" : "text-warm-300 hover:bg-ink-700 hover:text-warm-100",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {showBadge && (
              <span
                aria-label={`${approvalsCount} pendentes`}
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 text-xs font-semibold text-ink-900"
              >
                {approvalsCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
