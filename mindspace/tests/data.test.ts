import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDb, makeUser } from "./helpers";
import { createThought, convertThoughtToIdea, listThoughts, updateThought } from "@/server/services/thoughts";
import { createIdea, getIdeaDetail, listIdeas, updateIdea, addIdeaNote } from "@/server/services/ideas";
import { completeEvaluation, recordDecision, saveEvaluation, saveWeights, startEvaluation, getEvaluation } from "@/server/services/evaluations";
import { convertIdeaToProject, addTask, updateTask, getProjectDetail } from "@/server/services/projects";
import { moveToTrash, restoreFromTrash, deletePermanently, listTrash } from "@/server/services/trash";
import { createLink, getRelated } from "@/server/services/links";
import { globalSearch } from "@/server/services/search";
import { exportJSON, importJSON } from "@/server/services/backup";
import { createGoal } from "@/server/services/goals";

beforeEach(resetDb);

describe("capture → idea (Flow A)", () => {
  it("persists thoughts with tags and preserves original content on conversion", async () => {
    const u = await makeUser("me@example.com");
    const original = "What if I create a digital heritage experience for Nigerian cities?\nCould start with Lagos.";
    const t = await createThought(u.id, { content: original, tags: ["Heritage", "#AR"] });
    expect(t.tags.map((x) => x.tag.name).sort()).toEqual(["ar", "heritage"]);

    const idea = await convertThoughtToIdea(u.id, t.id);
    expect(idea.title).toBe("What if I create a digital heritage experience for Nigerian cities?");
    expect(idea.description).toBe(original);
    expect(idea.sourceThoughtId).toBe(t.id);

    const thoughtAfter = await db.thought.findUniqueOrThrow({ where: { id: t.id } });
    expect(thoughtAfter.content).toBe(original); // untouched
    expect(thoughtAfter.status).toBe("PROCESSED");
    expect(await listThoughts(u.id)).toHaveLength(0); // no longer in inbox

    const detail = await getIdeaDetail(u.id, idea.id);
    expect(detail.tags.map((x) => x.tag.name).sort()).toEqual(["ar", "heritage"]);
  });

  it("rejects empty thoughts", async () => {
    const u = await makeUser("me@example.com");
    await expect(createThought(u.id, { content: "   " })).rejects.toThrow();
  });
});

describe("evaluation & decisions (Flow B, D)", () => {
  it("computes, persists and preserves evaluation history", async () => {
    const u = await makeUser("me@example.com");
    const idea = await createIdea(u.id, { title: "Inventory app for small shops" });
    await saveWeights(u.id, { personalInterest: 2 });

    const ev1 = await startEvaluation(u.id, idea.id);
    expect((await db.idea.findUniqueOrThrow({ where: { id: idea.id } })).stage).toBe("EVALUATING");

    await saveEvaluation(u.id, ev1.id, {
      answers: { "problem.what": "Shops lose track of stock" },
      scores: { personalInterest: 8, potentialImpact: 6, feasibility: 7, skillAlignment: 5, costEfficiency: 9, timeEfficiency: 4, longTermValue: 10 },
    });
    await completeEvaluation(u.id, ev1.id);
    const saved = await getEvaluation(u.id, ev1.id);
    // weights: interest 2, rest 1 → (16+6+7+5+9+4+10)/80*100 = 71.3
    expect(saved.overallScore).toBe(71.3);
    expect(saved.scores.find((s) => s.criterion === "personalInterest")!.weight).toBe(2);
    expect((saved.answers as Record<string, string>)["problem.what"]).toBe("Shops lose track of stock");
    expect((await db.idea.findUniqueOrThrow({ where: { id: idea.id } })).latestScore).toBe(71.3);

    await recordDecision(u.id, idea.id, { outcome: "REVISIT_LATER", rationale: "Too busy right now", evaluationId: ev1.id });
    expect((await db.idea.findUniqueOrThrow({ where: { id: idea.id } })).stage).toBe("ON_HOLD");

    // Revisit: a new evaluation copies the old one but doesn't change it
    const ev2 = await startEvaluation(u.id, idea.id, { copyFromLatest: true });
    await saveEvaluation(u.id, ev2.id, { scores: { timeEfficiency: 8 } });
    const old = await getEvaluation(u.id, ev1.id);
    expect(old.scores.find((s) => s.criterion === "timeEfficiency")!.score).toBe(4);
    expect(old.overallScore).toBe(71.3);

    // Changing weights later doesn't alter a completed evaluation's stored weights
    await saveWeights(u.id, { personalInterest: 1 });
    await saveEvaluation(u.id, ev1.id, { answers: { "risks.wrong": "Competition" } });
    expect((await getEvaluation(u.id, ev1.id)).overallScore).toBe(71.3);

    await recordDecision(u.id, idea.id, { outcome: "PURSUE", rationale: "Circumstances changed", evaluationId: ev2.id });
    const detail = await getIdeaDetail(u.id, idea.id);
    expect(detail.evaluations).toHaveLength(2);
    expect(detail.decisions.map((d) => d.outcome)).toEqual(["PURSUE", "REVISIT_LATER"]);
    expect(detail.stage).toBe("WORTH_PURSUING");
  });

  it("refuses to complete an unscored evaluation and rejects all-zero weights", async () => {
    const u = await makeUser("me@example.com");
    const idea = await createIdea(u.id, { title: "x" });
    const ev = await startEvaluation(u.id, idea.id);
    await expect(completeEvaluation(u.id, ev.id)).rejects.toThrow(/Score at least one/);
    await expect(
      saveWeights(u.id, { personalInterest: 0, potentialImpact: 0, feasibility: 0, skillAlignment: 0, costEfficiency: 0, timeEfficiency: 0, longTermValue: 0 }),
    ).rejects.toThrow();
  });
});

describe("idea → project (Flow C)", () => {
  it("creates a linked project and tracks task completion", async () => {
    const u = await makeUser("me@example.com");
    const idea = await createIdea(u.id, { title: "AR heritage app", summary: "Walk Lagos history" });
    const project = await convertIdeaToProject(u.id, idea.id);
    expect(project.ideaId).toBe(idea.id);
    expect((await db.idea.findUniqueOrThrow({ where: { id: idea.id } })).stage).toBe("IN_PROGRESS");
    const related = await getRelated(u.id, "IDEA", idea.id);
    expect(related.map((r) => r.id)).toContain(project.id);

    const task = await addTask(u.id, project.id, { title: "Prototype one location" });
    await updateTask(u.id, task.id, { done: true });
    const detail = await getProjectDetail(u.id, project.id);
    expect(detail.tasks[0].done).toBe(true);
    expect(detail.tasks[0].completedAt).not.toBeNull();
  });
});

describe("trash", () => {
  it("soft deletes, restores and only purges trashed items", async () => {
    const u = await makeUser("me@example.com");
    const idea = await createIdea(u.id, { title: "Temp" });
    await expect(deletePermanently(u.id, "IDEA", idea.id)).rejects.toThrow(); // not trashed yet
    await moveToTrash(u.id, "IDEA", idea.id);
    expect(await listIdeas(u.id)).toHaveLength(0);
    expect(await listTrash(u.id)).toHaveLength(1);
    await restoreFromTrash(u.id, "IDEA", idea.id);
    expect(await listIdeas(u.id)).toHaveLength(1);
    await moveToTrash(u.id, "IDEA", idea.id);
    await deletePermanently(u.id, "IDEA", idea.id);
    expect(await db.idea.count()).toBe(0);
  });
});

describe("authorization — users only ever see their own data", () => {
  it("isolates every read and write path", async () => {
    const me = await makeUser("me@example.com");
    const other = await makeUser("other@example.com");
    const secretThought = await createThought(other.id, { content: "Other person's secret plan" });
    const secretIdea = await createIdea(other.id, { title: "Secret idea", description: "confidential" });
    await addIdeaNote(other.id, secretIdea.id, "confidential note");
    const secretEval = await startEvaluation(other.id, secretIdea.id);
    const secretGoal = await createGoal(other.id, { title: "Secret goal" });

    // Reads
    expect(await listThoughts(me.id, { status: "ALL" })).toHaveLength(0);
    expect(await listIdeas(me.id, { stage: "ALL" })).toHaveLength(0);
    await expect(getIdeaDetail(me.id, secretIdea.id)).rejects.toThrow(/not found/);
    await expect(getEvaluation(me.id, secretEval.id)).rejects.toThrow(/not found/);
    expect(await globalSearch(me.id, "secret")).toHaveLength(0);
    expect(await globalSearch(me.id, "confidential")).toHaveLength(0);
    expect(await globalSearch(other.id, "confidential")).not.toHaveLength(0);

    // Writes
    await expect(updateThought(me.id, secretThought.id, { content: "hacked" })).rejects.toThrow(/not found/);
    await expect(updateIdea(me.id, secretIdea.id, { title: "hacked" })).rejects.toThrow(/not found/);
    await expect(saveEvaluation(me.id, secretEval.id, { scores: { feasibility: 1 } })).rejects.toThrow(/not found/);
    await expect(recordDecision(me.id, secretIdea.id, { outcome: "PURSUE" })).rejects.toThrow(/not found/);
    await expect(convertIdeaToProject(me.id, secretIdea.id)).rejects.toThrow(/not found/);
    await expect(moveToTrash(me.id, "IDEA", secretIdea.id)).rejects.toThrow(/not found/);
    await expect(addIdeaNote(me.id, secretIdea.id, "x")).rejects.toThrow(/not found/);

    // Can't link my item to someone else's
    const mine = await createIdea(me.id, { title: "Mine" });
    await expect(createLink(me.id, { fromType: "IDEA", fromId: mine.id, toType: "GOAL", toId: secretGoal.id })).rejects.toThrow(/not found/);

    // Can't reference someone else's evaluation in my decision
    await expect(recordDecision(me.id, mine.id, { outcome: "PURSUE", evaluationId: secretEval.id })).rejects.toThrow(/not found/);

    // Data unchanged
    expect((await db.idea.findUniqueOrThrow({ where: { id: secretIdea.id } })).title).toBe("Secret idea");
    expect((await db.thought.findUniqueOrThrow({ where: { id: secretThought.id } })).content).toBe("Other person's secret plan");
  });
});

describe("export / import", () => {
  it("round-trips data into a fresh account and is idempotent", async () => {
    const u = await makeUser("me@example.com");
    const t = await createThought(u.id, { content: "Learn Houdini", tags: ["learning"] });
    const idea = await convertThoughtToIdea(u.id, t.id);
    const ev = await startEvaluation(u.id, idea.id);
    await saveEvaluation(u.id, ev.id, { scores: { feasibility: 7 } });
    await recordDecision(u.id, idea.id, { outcome: "RESEARCH_FURTHER", rationale: "Need a course" });
    const dump = JSON.parse(JSON.stringify(await exportJSON(u.id)));
    expect(JSON.stringify(dump)).not.toContain("passwordHash");

    await resetDb();
    const fresh = await makeUser("me@example.com");
    const counts = await importJSON(fresh.id, dump);
    expect(counts.ideas).toBe(1);
    const again = await importJSON(fresh.id, dump);
    expect(again.ideas).toBe(0);
    const detail = await getIdeaDetail(fresh.id, idea.id);
    expect(detail.decisions[0].rationale).toBe("Need a course");
    expect(detail.evaluations[0].scores[0].score).toBe(7);
    expect(detail.tags[0].tag.name).toBe("learning");
  });

  it("rejects files that aren't Mindspace exports", async () => {
    const u = await makeUser("me@example.com");
    await expect(importJSON(u.id, { hello: "world" })).rejects.toThrow(/Mindspace export/);
  });
});
