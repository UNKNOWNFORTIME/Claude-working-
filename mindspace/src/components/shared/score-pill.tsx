import { scoreBand } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const BAND_CLASS = {
  strong: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
  promising: "text-sky-700 dark:text-sky-300 bg-sky-500/10",
  mixed: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
  weak: "text-rose-700 dark:text-rose-300 bg-rose-500/10",
};

export function ScorePill({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score == null) return null;
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", BAND_CLASS[scoreBand(score)], className)} title="Latest evaluation score (out of 100)">
      {Math.round(score)}
    </span>
  );
}
