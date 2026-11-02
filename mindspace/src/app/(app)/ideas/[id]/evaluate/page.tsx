import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { assertUuid } from "@/server/page-helpers";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { outcomeLabel } from "@/lib/constants";
import { StartEvaluation } from "./start-evaluation";

export const metadata = { title: "Evaluate" };

/** Resumes an unfinished evaluation, or offers to start a new one. */
export default async function EvaluatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  assertUuid(id);
  const idea = await db.idea.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    include: {
      evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
    },
  });
  if (!idea) notFound();
  const latest = idea.evaluations[0];
  if (latest && !latest.completedAt) redirect(`/ideas/${id}/evaluations/${latest.id}`);
  const lastDecision = idea.decisions[0];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/ideas/${id}`} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {idea.title}
      </Link>
      <h1 className="font-serif text-3xl tracking-tight">Evaluate “{idea.title}”</h1>
      <p className="mt-3 text-muted-foreground">
        Work through seven areas — problem, motivation, feasibility, cost, potential, risks and opportunity cost — then score it. The score is a
        thinking aid, not a verdict. Skip anything that doesn&apos;t apply; everything saves as you type.
      </p>
      {latest && (
        <div className="mt-6 rounded-xl border bg-card p-4 text-sm">
          <p>
            You last evaluated this on <strong>{formatDate(latest.completedAt ?? latest.createdAt)}</strong>
            {latest.overallScore != null && <> with a score of <strong>{Math.round(latest.overallScore)}/100</strong></>}.
            {lastDecision && <> Your decision: <strong>{outcomeLabel(lastDecision.outcome)}</strong>{lastDecision.rationale && <> — “{lastDecision.rationale}”</>}.</>}
          </p>
          <p className="mt-1 text-muted-foreground">A new evaluation won&apos;t change the old one. You can start from your previous answers to see what&apos;s changed.</p>
        </div>
      )}
      <StartEvaluation ideaId={id} hasPrevious={!!latest} />
    </div>
  );
}
