import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

/**
 * KPI tile with reserved space (fixed min-height + a hint slot that never collapses) so a
 * grid of tiles never shifts as values stream in. Tone maps to the semantic palette.
 */
const TONE: Record<"default" | "ok" | "warn" | "bad", string> = {
  default: "text-warm-100",
  ok: "text-emerald-500",
  warn: "text-gold-500",
  bad: "text-clay-500",
};

export function MetricTile({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "bad";
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-h-[104px] flex-col justify-between rounded-xl border border-ink-500 bg-ink-700 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-warm-500">{label}</span>
        {Icon && <Icon className="size-4 shrink-0 text-warm-500" />}
      </div>
      <div className={cn("font-display text-3xl font-bold", TONE[tone])}>{value}</div>
      {/* reserved hint row — invisible placeholder keeps tile heights equal */}
      <p className={cn("text-xs", hint ? "text-warm-400" : "select-none text-transparent")}>{hint ?? "·"}</p>
    </div>
  );
}
