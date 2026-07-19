"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * PRD-02 F7 — session idle timeout. Clerk's server-side inactivity timeout (10 min)
 * is authoritative; this is the Lince-built pre-expiry UI Clerk doesn't provide: a
 * warning modal at T-minus-60s with Continue / Log out. On expiry the user is signed
 * out and returned to /sign-in?expired=1.
 *
 * ponytail: the 10-min window is mirrored client-side here for the UX; the real expiry
 * lives in the Clerk dashboard (PRD-02 open item #5). Keep the two in sync.
 */
const IDLE_MS = 10 * 60 * 1000; // total inactivity before expiry
const WARN_MS = 60 * 1000; // show the warning this long before expiry
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "pointermove"] as const;

export function SessionTimeout() {
  const clerk = useClerk();
  const [countdown, setCountdown] = useState<number | null>(null); // null = no warning shown
  const warningRef = useRef(false);
  const timers = useRef<{
    warn?: ReturnType<typeof setTimeout>;
    expire?: ReturnType<typeof setTimeout>;
    tick?: ReturnType<typeof setInterval>;
  }>({});

  const clearTimers = useCallback(() => {
    const t = timers.current;
    if (t.warn) clearTimeout(t.warn);
    if (t.expire) clearTimeout(t.expire);
    if (t.tick) clearInterval(t.tick);
    timers.current = {};
  }, []);

  const logout = useCallback(() => {
    clearTimers();
    void clerk.signOut({ redirectUrl: "/sign-in?expired=1" });
  }, [clearTimers, clerk]);

  // Timer scheduling only — no setState, so the mount effect can call it directly
  // (react-hooks/set-state-in-effect). Countdown starts null on mount; only re-arms
  // from event/timer callbacks need the explicit reset in arm().
  const schedule = useCallback(() => {
    clearTimers();
    warningRef.current = false;
    timers.current.warn = setTimeout(() => {
      warningRef.current = true;
      setCountdown(Math.round(WARN_MS / 1000));
      timers.current.tick = setInterval(() => {
        setCountdown((s) => (s != null && s > 0 ? s - 1 : 0));
      }, 1000);
      timers.current.expire = setTimeout(logout, WARN_MS);
    }, IDLE_MS - WARN_MS);
  }, [clearTimers, logout]);

  const arm = useCallback(() => {
    schedule();
    setCountdown(null);
  }, [schedule]);

  const stayActive = useCallback(async () => {
    try {
      await clerk.session?.touch(); // refresh Clerk's last-active so the server expiry resets too
    } catch {
      // local re-arm is enough for the UX; Clerk remains authoritative
    }
    arm();
  }, [clerk, arm]);

  useEffect(() => {
    schedule();
    const onActivity = () => {
      // before the warning: extend silently. During the warning: require an explicit choice.
      if (!warningRef.current) arm();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearTimers();
    };
  }, [schedule, arm, clearTimers]);

  if (countdown == null) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-xl border border-ink-500 bg-ink-700 p-6 text-center shadow-xl">
        <h2 id="session-timeout-title" className="font-display text-xl font-bold text-warm-100">
          Sua sessão está prestes a expirar
        </h2>
        <p className="mt-2 text-sm text-warm-300">
          Por segurança, você será desconectado em{" "}
          <span className="font-mono text-warm-100">{countdown}s</span> por inatividade.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={stayActive} className="w-full" autoFocus>
            Continuar conectado
          </Button>
          <Button onClick={logout} variant="ghost" className="w-full">
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
