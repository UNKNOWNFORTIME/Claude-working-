"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveWeights } from "@/server/actions/evaluations";
import { CRITERIA, DEFAULT_WEIGHTS, type Weights } from "@/lib/scoring";
import { Button } from "@/components/ui/button";

export function WeightsSection({ initial }: { initial: Weights }) {
  const [w, setW] = useState(initial);
  const [pending, start] = useTransition();
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  const dirty = JSON.stringify(w) !== JSON.stringify(initial);
  return (
    <div className="space-y-4">
      {CRITERIA.map((c) => (
        <div key={c.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.75rem] items-center gap-2 sm:grid-cols-[9rem_1fr_5.5rem] sm:gap-3">
          <label htmlFor={`w-${c.key}`} className="text-sm">{c.label}</label>
          <input id={`w-${c.key}`} type="range" min={0} max={3} step={0.25} value={w[c.key]} onChange={(e) => setW({ ...w, [c.key]: Number(e.target.value) })} className="accent-[var(--color-primary)]" />
          <span className="text-right text-xs tabular-nums text-muted-foreground">×{w[c.key].toFixed(2)} · {total ? Math.round((w[c.key] / total) * 100) : 0}%</span>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Percentages show each criterion&apos;s share of the total score. Set a weight to 0 to ignore a criterion.</p>
      <div className="flex gap-2">
        <Button size="sm" disabled={!dirty} loading={pending} onClick={() => start(async () => { const r = await saveWeights(w); r.ok ? toast.success("Weights saved") : toast.error(r.error); })}>Save weights</Button>
        <Button size="sm" variant="ghost" onClick={() => setW(DEFAULT_WEIGHTS)}>Reset to equal</Button>
      </div>
    </div>
  );
}
