"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Gavel } from "lucide-react";
import { recordDecision } from "@/server/actions/evaluations";
import { DECISION_OUTCOMES, OUTCOME_TO_STAGE, stageLabel } from "@/lib/constants";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DecisionOutcome } from "@prisma/client";

const RING: Record<string, string> = {
  emerald: "data-[on=true]:border-emerald-500/50 data-[on=true]:bg-emerald-500/5",
  sky: "data-[on=true]:border-sky-500/50 data-[on=true]:bg-sky-500/5",
  amber: "data-[on=true]:border-amber-500/50 data-[on=true]:bg-amber-500/5",
  rose: "data-[on=true]:border-rose-500/50 data-[on=true]:bg-rose-500/5",
};

export function DecisionDialog({ ideaId, evaluationId, label = "Record decision", variant = "outline", size = "sm", onDone }: {
  ideaId: string; evaluationId?: string | null; label?: string; variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);
  const [rationale, setRationale] = useState("");
  const [revisitAt, setRevisitAt] = useState("");
  const [decidedAt, setDecidedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, start] = useTransition();

  const submit = () =>
    outcome &&
    start(async () => {
      const res = await recordDecision(ideaId, {
        outcome,
        rationale,
        evaluationId: evaluationId ?? null,
        revisitAt: outcome === "REVISIT_LATER" && revisitAt ? revisitAt : null,
        // Today keeps the exact time so same-day history stays in order
        decidedAt: decidedAt && decidedAt !== new Date().toISOString().slice(0, 10) ? decidedAt : undefined,
      } as Parameters<typeof recordDecision>[1]);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Decision recorded — idea moved to “${stageLabel(OUTCOME_TO_STAGE[outcome])}”`);
      setOpen(false);
      setOutcome(null);
      setRationale("");
      router.refresh();
      onDone?.();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}><Gavel /> {label}</Button>
      <DialogContent title="Make a decision" description="Decisions are kept as history — you can always change your mind later with a new one.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Outcome">
            {DECISION_OUTCOMES.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={outcome === o.value}
                data-on={outcome === o.value}
                onClick={() => setOutcome(o.value)}
                className={cn("rounded-lg border p-3 text-left transition-colors hover:bg-muted/50", RING[o.tone])}
              >
                <div className="text-sm font-medium">{o.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{o.description}</div>
              </button>
            ))}
          </div>
          <Field label="Why? (optional, but your future self will thank you)" htmlFor="rationale">
            <Textarea id="rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3} placeholder="What tipped the decision? What would change it?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Decision date" htmlFor="decided-at">
              <Input id="decided-at" type="date" value={decidedAt} onChange={(e) => setDecidedAt(e.target.value)} />
            </Field>
            {outcome === "REVISIT_LATER" && (
              <Field label="Revisit on (optional)" htmlFor="revisit-at">
                <Input id="revisit-at" type="date" value={revisitAt} onChange={(e) => setRevisitAt(e.target.value)} />
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!outcome} loading={pending}>Record decision</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
