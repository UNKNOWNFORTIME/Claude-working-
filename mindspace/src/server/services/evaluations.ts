import { db } from "@/lib/db";
import { decisionSchema, evaluationSaveSchema, weightsSchema } from "@/lib/validation";
import { CRITERION_KEYS, computeScore, normalizeWeights, type Scores, type Weights } from "@/lib/scoring";
import { OUTCOME_TO_STAGE } from "@/lib/constants";
import { ownedIdea } from "./ideas";
import { NotFoundError, ValidationError } from "./errors";

export async function getWeights(userId: string): Promise<Weights> {
  const s = await db.settings.findUnique({ where: { userId }, select: { scoringWeights: true } });
  return normalizeWeights(s?.scoringWeights);
}

export async function saveWeights(userId: string, input: unknown) {
  const parsed = weightsSchema.parse(input);
  const weights = normalizeWeights(parsed);
  if (CRITERION_KEYS.every((k) => weights[k] === 0)) throw new ValidationError("At least one criterion needs a weight above zero");
  await db.settings.upsert({
    where: { userId },
    create: { userId, scoringWeights: weights },
    update: { scoringWeights: weights },
  });
  return weights;
}

/** Weights snapshot stored with an evaluation's scores, falling back to current weights. */
export function evaluationWeights(scores: { criterion: string; weight: number }[], fallback: Weights): Weights {
  const out = { ...fallback };
  for (const s of scores) if ((CRITERION_KEYS as string[]).includes(s.criterion)) out[s.criterion as keyof Weights] = s.weight;
  return out;
}

async function ownedEvaluation(userId: string, id: string) {
  const ev = await db.evaluation.findFirst({ where: { id, userId }, include: { scores: true } });
  if (!ev) throw new NotFoundError("Evaluation");
  return ev;
}

/**
 * Starts a new evaluation. Previous evaluations are never modified — each one is
 * a snapshot of my thinking at that time. Optionally pre-fills answers from the
 * latest evaluation so revisiting doesn't start from scratch.
 */
export async function startEvaluation(userId: string, ideaId: string, opts: { copyFromLatest?: boolean } = {}) {
  const idea = await ownedIdea(userId, ideaId);
  const weights = await getWeights(userId);
  let answers: Record<string, string> = {};
  let scores: Scores = {};
  if (opts.copyFromLatest) {
    const prev = await db.evaluation.findFirst({ where: { ideaId, userId }, orderBy: { createdAt: "desc" }, include: { scores: true } });
    if (prev) {
      answers = (prev.answers as Record<string, string>) ?? {};
      scores = Object.fromEntries(prev.scores.map((s) => [s.criterion, s.score]));
    }
  }
  const result = computeScore(scores, weights);
  const ev = await db.evaluation.create({
    data: {
      userId,
      ideaId,
      answers,
      overallScore: result.overall,
      scores: {
        create: CRITERION_KEYS.filter((k) => scores[k] != null).map((k) => ({ criterion: k, score: scores[k] as number, weight: weights[k] })),
      },
    },
  });
  if (idea.stage === "JUST_AN_IDEA" || idea.stage === "EXPLORING") {
    await db.idea.update({ where: { id: ideaId }, data: { stage: "EVALUATING" } });
  }
  return ev;
}

/** Autosave target for the evaluation workspace. */
export async function saveEvaluation(userId: string, id: string, input: unknown) {
  const data = evaluationSaveSchema.parse(input);
  const ev = await ownedEvaluation(userId, id);
  // Completed evaluations keep the weights they were scored with, so history stays explainable.
  const currentWeights = await getWeights(userId);
  const weights = ev.completedAt ? evaluationWeights(ev.scores, currentWeights) : currentWeights;

  const current: Scores = Object.fromEntries(ev.scores.map((s) => [s.criterion, s.score]));
  const nextScores: Scores = { ...current };
  if (data.scores) {
    for (const [k, v] of Object.entries(data.scores)) {
      if ((CRITERION_KEYS as string[]).includes(k)) nextScores[k as keyof Scores] = v;
    }
  }
  const result = computeScore(nextScores, weights);

  return db.$transaction(async (tx) => {
    if (data.scores) {
      for (const k of CRITERION_KEYS) {
        const v = nextScores[k];
        if (v == null) {
          await tx.evaluationScore.deleteMany({ where: { evaluationId: id, criterion: k } });
        } else {
          await tx.evaluationScore.upsert({
            where: { evaluationId_criterion: { evaluationId: id, criterion: k } },
            create: { evaluationId: id, criterion: k, score: v, weight: weights[k] },
            update: { score: v, weight: weights[k] },
          });
        }
      }
    }
    const updated = await tx.evaluation.update({
      where: { id },
      data: {
        answers: data.answers ? { ...(ev.answers as object), ...data.answers } : undefined,
        uncertainties: data.uncertainties,
        overallScore: result.overall,
      },
      include: { scores: true },
    });
    if (updated.completedAt) await refreshLatestScore(tx, ev.ideaId);
    return updated;
  });
}

export async function completeEvaluation(userId: string, id: string) {
  const ev = await ownedEvaluation(userId, id);
  if (!ev.scores.length) throw new ValidationError("Score at least one criterion before completing the evaluation");
  return db.$transaction(async (tx) => {
    const done = await tx.evaluation.update({ where: { id }, data: { completedAt: ev.completedAt ?? new Date() } });
    await refreshLatestScore(tx, ev.ideaId);
    return done;
  });
}

export async function deleteEvaluation(userId: string, id: string) {
  const ev = await ownedEvaluation(userId, id);
  await db.$transaction(async (tx) => {
    await tx.evaluation.delete({ where: { id } });
    await refreshLatestScore(tx, ev.ideaId);
  });
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
async function refreshLatestScore(tx: Tx, ideaId: string) {
  const latest = await tx.evaluation.findFirst({
    where: { ideaId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    select: { overallScore: true },
  });
  await tx.idea.update({ where: { id: ideaId }, data: { latestScore: latest?.overallScore ?? null } });
}

export async function getEvaluation(userId: string, id: string) {
  const ev = await db.evaluation.findFirst({
    where: { id, userId },
    include: { scores: true, idea: { select: { id: true, title: true, summary: true, deletedAt: true } }, decisions: { orderBy: { decidedAt: "desc" } } },
  });
  if (!ev || ev.idea.deletedAt) throw new NotFoundError("Evaluation");
  return ev;
}

/** Records a decision (append-only) and moves the idea to the matching stage. */
export async function recordDecision(userId: string, ideaId: string, input: unknown) {
  const d = decisionSchema.parse(input);
  await ownedIdea(userId, ideaId);
  if (d.evaluationId) {
    const ev = await db.evaluation.findFirst({ where: { id: d.evaluationId, userId, ideaId }, select: { id: true } });
    if (!ev) throw new NotFoundError("Evaluation");
  }
  return db.$transaction(async (tx) => {
    const decision = await tx.decision.create({
      data: {
        userId,
        ideaId,
        evaluationId: d.evaluationId ?? null,
        outcome: d.outcome,
        rationale: d.rationale,
        revisitAt: d.revisitAt ?? null,
        decidedAt: d.decidedAt ?? new Date(),
      },
    });
    await tx.idea.update({ where: { id: ideaId }, data: { stage: OUTCOME_TO_STAGE[d.outcome] } });
    return decision;
  });
}

export async function listDecisions(userId: string, opts: { take?: number } = {}) {
  return db.decision.findMany({
    where: { userId, idea: { deletedAt: null } },
    orderBy: { decidedAt: "desc" },
    include: { idea: { select: { id: true, title: true, stage: true } }, evaluation: { select: { overallScore: true } } },
    take: opts.take ?? 200,
  });
}
