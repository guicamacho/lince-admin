/**
 * Small pt-BR display formatters shared by the orgs grid, aging queue, org 360 and
 * status history. Elapsed is wall-clock (the backend computes elapsed_seconds server-side;
 * these just render it). CNPJ display is masked per the ruling — full value copies, not shows.
 */

export function elapsedDays(seconds: number): number {
  return Math.floor(seconds / 86400);
}

/** Human elapsed in pt-BR: "3 dias" / "5 h" / "20 min". null → em-dash. */
export function elapsedLabel(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days} ${days === 1 ? "dia" : "dias"}`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours} h`;
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

/** Latency days (float) → "1,5d" (pt-BR comma decimal). null → em-dash. */
export function daysLabel(days: number | null | undefined): string {
  return days == null ? "—" : `${days.toFixed(1).replace(".", ",")}d`;
}

const CNPJ_RE = /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/;

export function formatCnpj(raw: string): string {
  const d = (raw ?? "").replace(/\D/g, "");
  const m = d.match(CNPJ_RE);
  return m ? `${m[1]}.${m[2]}.${m[3]}/${m[4]}-${m[5]}` : (raw ?? "");
}

/** Masked display: keeps the branch prefix + check digits, hides the registration core. */
export function maskCnpj(raw: string): string {
  const d = (raw ?? "").replace(/\D/g, "");
  const m = d.match(CNPJ_RE);
  return m ? `${m[1]}.•••.•••/••••-${m[5]}` : (raw ?? "");
}

export function formatDate(s: string | null | undefined): string {
  return s ? new Date(s).toLocaleDateString("pt-BR") : "—";
}

export function formatDateTime(s: string | null | undefined): string {
  return s ? new Date(s).toLocaleString("pt-BR") : "—";
}
