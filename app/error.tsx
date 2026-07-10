"use client";

/**
 * Global error boundary: backend read failures THROW (lib/admin-api.ts) and land here —
 * an explicit error screen instead of pages silently rendering "0 results", which once
 * masked a broken service token for a day (2026-07-08).
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold">Não foi possível carregar os dados</h1>
      <p className="max-w-md text-sm text-warm-400">
        O backend não respondeu como esperado. Verifique se a API está no ar e tente novamente.
      </p>
      <p className="max-w-md font-mono text-xs text-warm-500">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 inline-flex min-h-10 cursor-pointer items-center rounded-[10px] bg-gold-500 px-4 text-sm font-bold text-ink-900 transition-colors hover:bg-gold-400 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Tentar novamente
      </button>
    </main>
  );
}
