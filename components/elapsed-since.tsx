"use client";

import { useSyncExternalStore } from "react";
import { elapsedLabel } from "@/lib/format";

/**
 * Client-only relative elapsed ("3 dias") since a timestamp, read via useSyncExternalStore so
 * it is SSR-safe (server + hydration render "—", the client fills in after) without a
 * setState-in-effect or an impure Date.now() in render. The snapshot is captured once (elapsed
 * of days doesn't need to tick), which also keeps getSnapshot stable (no render loop).
 */
const subscribe = () => () => {};
let clientNow: number | null = null;
const getSnapshot = () => (clientNow ??= Date.now());
const getServerSnapshot = () => null;

export function ElapsedSince({ since }: { since: string | null }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!since || now == null) return <>—</>;
  return <>{elapsedLabel((now - Date.parse(since)) / 1000)}</>;
}
