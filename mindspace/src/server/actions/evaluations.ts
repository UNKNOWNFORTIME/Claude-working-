"use server";
import { run } from "./_run";
import * as svc from "@/server/services/evaluations";

export async function startEvaluation(ideaId: string, copyFromLatest = false) {
  return run(async (uid) => ({ id: (await svc.startEvaluation(uid, ideaId, { copyFromLatest })).id }), [`/ideas/${ideaId}`, "/ideas"]);
}

export async function saveEvaluation(id: string, input: { answers?: Record<string, string>; scores?: Record<string, number | null>; uncertainties?: string }) {
  return run(async (uid) => {
    const ev = await svc.saveEvaluation(uid, id, input);
    return { overallScore: ev.overallScore, updatedAt: ev.updatedAt };
  });
}

export async function completeEvaluation(ideaId: string, id: string) {
  return run(async (uid) => {
    await svc.completeEvaluation(uid, id);
    return null;
  }, [`/ideas/${ideaId}`, "/ideas", "/"]);
}

export async function deleteEvaluation(ideaId: string, id: string) {
  return run(async (uid) => {
    await svc.deleteEvaluation(uid, id);
    return null;
  }, [`/ideas/${ideaId}`, "/ideas"]);
}

export async function recordDecision(ideaId: string, input: { outcome: string; rationale?: string; evaluationId?: string | null; revisitAt?: string | null }) {
  return run(async (uid) => {
    await svc.recordDecision(uid, ideaId, input);
    return null;
  }, ["/", "/ideas", `/ideas/${ideaId}`, "/reflections"]);
}

export async function saveWeights(weights: Record<string, number>) {
  return run(async (uid) => svc.saveWeights(uid, weights), ["/settings"]);
}
