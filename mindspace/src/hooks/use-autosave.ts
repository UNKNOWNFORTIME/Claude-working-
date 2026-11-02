"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Debounced autosave. Call `queue(patch)` on every change; patches are merged
 * and flushed after `delay` ms of inactivity, on blur via `flush()`, and before
 * the page unloads. Failed saves keep the pending patch and retry on next change.
 */
export function useAutosave<T extends object>(
  save: (patch: Partial<T>) => Promise<{ ok: boolean; error?: string }>,
  delay = 800,
  merge: (a: Partial<T>, b: Partial<T>) => Partial<T> = (a, b) => ({ ...a, ...b }),
) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Partial<T>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const mergeRef = useRef(merge);
  mergeRef.current = merge;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inflight.current) await inflight.current;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setState("saving");
    inflight.current = (async () => {
      try {
        const res = await saveRef.current(patch);
        if (!res.ok) throw new Error(res.error ?? "Save failed");
        setError(null);
        setState(Object.keys(pending.current).length ? "pending" : "saved");
      } catch (e) {
        pending.current = mergeRef.current(patch, pending.current);
        setError((e as Error).message);
        setState("error");
      } finally {
        inflight.current = null;
      }
    })();
    await inflight.current;
  }, []);

  const queue = useCallback(
    (patch: Partial<T>) => {
      pending.current = mergeRef.current(pending.current, patch);
      setState("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      void flush(); // save on unmount (client-side navigation)
    };
  }, [flush]);

  return { queue, flush, state, error };
}
