"use client";
import { Check, CloudOff, Loader2 } from "lucide-react";
import type { SaveState } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";

export function SaveIndicator({ state, error, className }: { state: SaveState; error?: string | null; className?: string }) {
  if (state === "idle") return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", state === "error" && "text-destructive", className)} role="status" aria-live="polite" title={error ?? undefined}>
      {state === "saving" || state === "pending" ? <Loader2 className="size-3 animate-spin" /> : state === "saved" ? <Check className="size-3" /> : <CloudOff className="size-3" />}
      {state === "pending" ? "Editing…" : state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Not saved — will retry"}
    </span>
  );
}
