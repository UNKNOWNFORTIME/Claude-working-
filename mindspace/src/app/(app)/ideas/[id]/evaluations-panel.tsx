"use client";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Gavel } from "lucide-react";
import type { IdeaDetail } from "@/server/services/ideas";
import { outcomeLabel, outcomeTone } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionLabel } from "@/components/ui/misc";
import { ScorePill } from "@/components/shared/score-pill";
import { DecisionDialog } from "@/components/shared/decision-dialog";
import { criterionLabel } from "@/lib/scoring";

export function EvaluationsPanel({ idea }: { idea: IdeaDetail }) {
  // One timeline of evaluations + decisions so I can see how my thinking changed
  const timeline = [
    ...idea.evaluations.map((e) => ({ kind: "evaluation" as const, date: e.completedAt ?? e.createdAt, e })),
    ...idea.decisions.map((d) => ({ kind: "decision" as const, date: d.decidedAt, d })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm"><Link href={`/ideas/${idea.id}/evaluate`}><ClipboardCheck /> New evaluation</Link></Button>
        <DecisionDialog ideaId={idea.id} evaluationId={idea.evaluations.find((e) => e.completedAt)?.id} />
      </div>
      {timeline.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Not evaluated yet">
          A structured evaluation helps separate ideas that are exciting from ideas that are worth doing.
        </EmptyState>
      ) : (
        <div>
          <SectionLabel className="mb-3">History</SectionLabel>
          <ol className="relative space-y-3 border-l pl-5">
            {timeline.map((item) =>
              item.kind === "evaluation" ? (
                <li key={`e${item.e.id}`} className="relative">
                  <span className="absolute -left-[27px] top-3 flex size-3 items-center justify-center rounded-full border-2 border-background bg-primary/60" aria-hidden />
                  <Link href={`/ideas/${idea.id}/evaluations/${item.e.id}`} className="group block rounded-xl border bg-card p-4 transition-colors hover:border-ring/30">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Evaluation</span>
                      {!item.e.completedAt && <Badge tone="amber">Draft</Badge>}
                      <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                      <span className="ml-auto flex items-center gap-2"><ScorePill score={item.e.overallScore} /><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span>
                    </div>
                    {item.e.scores.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {item.e.scores.map((s) => <span key={s.criterion}>{criterionLabel(s.criterion)} <span className="tabular-nums text-foreground/80">{s.score}</span></span>)}
                      </div>
                    )}
                  </Link>
                </li>
              ) : (
                <li key={`d${item.d.id}`} className="relative">
                  <span className="absolute -left-[27px] top-3 flex size-3 items-center justify-center rounded-full border-2 border-background bg-foreground/50" aria-hidden />
                  <div className="rounded-xl border border-dashed p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Gavel className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Decided:</span>
                      <Badge tone={outcomeTone(item.d.outcome)}>{outcomeLabel(item.d.outcome)}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(item.d.decidedAt)}</span>
                      {item.d.evaluation?.overallScore != null && <span className="text-xs text-muted-foreground">· based on a {Math.round(item.d.evaluation.overallScore)}/100 evaluation</span>}
                    </div>
                    {item.d.rationale && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{item.d.rationale}</p>}
                    {item.d.revisitAt && <p className="mt-1 text-xs text-muted-foreground">Revisit on {formatDate(item.d.revisitAt)}</p>}
                  </div>
                </li>
              ),
            )}
          </ol>
        </div>
      )}
    </div>
  );
}
