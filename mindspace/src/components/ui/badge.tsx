import * as React from "react";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  slate: "bg-stone-500/10 text-stone-700 dark:text-stone-300 ring-stone-500/20",
  zinc: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-zinc-500/20",
  stone: "bg-stone-500/10 text-stone-600 dark:text-stone-400 ring-stone-500/20",
  sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  teal: "bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-teal-500/20",
  rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20",
  pink: "bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-pink-500/20",
  primary: "bg-accent text-accent-foreground ring-primary/20",
};

export function Badge({ tone = "slate", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap", TONES[tone] ?? TONES.slate, className)}
      {...props}
    />
  );
}

export function TagChip({ name, className, onRemove }: { name: string; className?: string; onRemove?: () => void }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground", className)}>
      #{name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-foreground" aria-label={`Remove tag ${name}`}>
          ×
        </button>
      )}
    </span>
  );
}

export const DOT_TONES: Record<string, string> = {
  slate: "bg-stone-400", zinc: "bg-zinc-400", stone: "bg-stone-400", sky: "bg-sky-500", violet: "bg-violet-500",
  emerald: "bg-emerald-500", amber: "bg-amber-500", teal: "bg-teal-500", rose: "bg-rose-500", pink: "bg-pink-500",
};
export function Dot({ tone = "slate", className }: { tone?: string; className?: string }) {
  return <span className={cn("inline-block size-2 rounded-full", DOT_TONES[tone] ?? DOT_TONES.slate, className)} aria-hidden />;
}
