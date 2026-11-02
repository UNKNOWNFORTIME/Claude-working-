import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getEvaluation, getWeights, evaluationWeights } from "@/server/services/evaluations";
import { getAISettingsView } from "@/server/services/settings";
import { assertUuid, orNotFound } from "@/server/page-helpers";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { EvaluationWorkspace } from "./evaluation-workspace";

export const metadata = { title: "Evaluation" };

export default async function EvaluationPage({ params }: { params: Promise<{ id: string; evalId: string }> }) {
  const user = await requireUser();
  const { id, evalId } = await params;
  assertUuid(id);
  assertUuid(evalId);
  const ev = await orNotFound(() => getEvaluation(user.id, evalId));
  if (ev.ideaId !== id) notFound();
  const current = await getWeights(user.id);
  const weights = ev.completedAt ? evaluationWeights(ev.scores, current) : current;
  const [previous, ai] = await Promise.all([
    db.evaluation.findFirst({
      where: { ideaId: id, userId: user.id, createdAt: { lt: ev.createdAt } },
      orderBy: { createdAt: "desc" },
      include: { scores: true },
    }),
    getAISettingsView(user.id),
  ]);

  return (
    <div>
      <Link href={`/ideas/${id}?tab=evaluations`} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {ev.idea.title}
      </Link>
      <EvaluationWorkspace
        evaluation={{
          id: ev.id,
          ideaId: id,
          ideaTitle: ev.idea.title,
          ideaSummary: ev.idea.summary,
          answers: (ev.answers ?? {}) as Record<string, string>,
          scores: Object.fromEntries(ev.scores.map((s) => [s.criterion, s.score])),
          uncertainties: ev.uncertainties,
          completedAt: ev.completedAt,
          createdAt: ev.createdAt,
          decisions: ev.decisions.map((d) => ({ id: d.id, outcome: d.outcome, rationale: d.rationale, decidedAt: d.decidedAt })),
        }}
        weights={weights}
        weightsAreSnapshot={!!ev.completedAt}
        previous={previous ? { createdAt: previous.createdAt, overallScore: previous.overallScore, scores: Object.fromEntries(previous.scores.map((s) => [s.criterion, s.score])) } : null}
        aiReady={ai.ready}
      />
    </div>
  );
}
