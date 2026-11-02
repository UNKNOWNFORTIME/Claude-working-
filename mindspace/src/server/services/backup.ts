import { db } from "@/lib/db";
import { questionText } from "@/lib/evaluation-questions";
import { criterionLabel } from "@/lib/scoring";
import { goalKindLabel, outcomeLabel, projectStatusLabel, stageLabel, thoughtTypeLabel } from "@/lib/constants";
import { ValidationError } from "./errors";
import type { Prisma } from "@prisma/client";

export const EXPORT_VERSION = 1;

/** Full export of a user's data. Excludes password hash and the encrypted API key. */
export async function exportJSON(userId: string) {
  const u = { userId };
  const [user, settings, categories, tags, thoughts, thoughtTags, ideas, ideaTags, ideaNotes, evaluations, evaluationScores, decisions, projects, milestones, tasks, goals, reflections, links, aiConversations, aiMessages] =
    await Promise.all([
      db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true, createdAt: true } }),
      db.settings.findUnique({ where: u, select: { scoringWeights: true, aiEnabled: true, aiBaseUrl: true, aiModel: true } }),
      db.category.findMany({ where: u }),
      db.tag.findMany({ where: u }),
      db.thought.findMany({ where: u }),
      db.thoughtTag.findMany({ where: { thought: u } }),
      db.idea.findMany({ where: u }),
      db.ideaTag.findMany({ where: { idea: u } }),
      db.ideaNote.findMany({ where: u }),
      db.evaluation.findMany({ where: u }),
      db.evaluationScore.findMany({ where: { evaluation: u } }),
      db.decision.findMany({ where: u }),
      db.project.findMany({ where: u }),
      db.milestone.findMany({ where: { OR: [{ project: u }, { goal: u }] } }),
      db.task.findMany({ where: u }),
      db.goal.findMany({ where: u }),
      db.reflection.findMany({ where: u }),
      db.entityLink.findMany({ where: u }),
      db.aIConversation.findMany({ where: u }),
      db.aIMessage.findMany({ where: { conversation: u } }),
    ]);
  return {
    app: "mindspace",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    user,
    settings,
    data: { categories, tags, thoughts, thoughtTags, ideas, ideaTags, ideaNotes, evaluations, evaluationScores, decisions, projects, milestones, tasks, goals, reflections, links, aiConversations, aiMessages },
  };
}
export type ExportPayload = Awaited<ReturnType<typeof exportJSON>>;

const md = (s: string | null | undefined) => (s ?? "").trim();
const d = (x: Date | string | null | undefined) => (x ? new Date(x).toISOString().slice(0, 10) : "");

/** Human-readable Markdown export — readable without Mindspace. */
export async function exportMarkdown(userId: string) {
  const { data } = await exportJSON(userId);
  const tagName = new Map(data.tags.map((t) => [t.id, t.name]));
  const catName = new Map(data.categories.map((c) => [c.id, c.name]));
  const out: string[] = [`# Mindspace export`, `Exported ${new Date().toISOString()}`, ""];

  const live = <T extends { deletedAt: Date | null }>(xs: T[]) => xs.filter((x) => !x.deletedAt);

  out.push(`## Ideas`, "");
  for (const idea of live(data.ideas)) {
    const tags = data.ideaTags.filter((t) => t.ideaId === idea.id).map((t) => `#${tagName.get(t.tagId)}`);
    out.push(`### ${idea.title}`, "");
    out.push(`- Stage: ${stageLabel(idea.stage)} · Priority: ${idea.priority}${idea.categoryId ? ` · Category: ${catName.get(idea.categoryId)}` : ""}`);
    out.push(`- Created ${d(idea.createdAt)} · Updated ${d(idea.updatedAt)}${idea.latestScore != null ? ` · Latest score ${idea.latestScore}/100` : ""}`);
    if (tags.length) out.push(`- Tags: ${tags.join(" ")}`);
    out.push("");
    if (md(idea.summary)) out.push(`> ${md(idea.summary)}`, "");
    if (md(idea.description)) out.push(md(idea.description), "");
    if (md(idea.motivation)) out.push(`**Why I care:** ${md(idea.motivation)}`, "");
    const refs = (idea.references as { title: string; url: string }[]) ?? [];
    if (refs.length) out.push(`**References**`, ...refs.map((r) => `- [${r.title || r.url}](${r.url})`), "");
    const notes = data.ideaNotes.filter((n) => n.ideaId === idea.id);
    if (notes.length) out.push(`#### Notes`, ...notes.map((n) => `- (${d(n.createdAt)}) ${md(n.content).replace(/\n/g, "\n  ")}`), "");
    for (const ev of data.evaluations.filter((e) => e.ideaId === idea.id)) {
      out.push(`#### Evaluation — ${d(ev.createdAt)}${ev.overallScore != null ? ` — ${ev.overallScore}/100` : ""}${ev.completedAt ? "" : " (draft)"}`);
      const scores = data.evaluationScores.filter((s) => s.evaluationId === ev.id);
      if (scores.length) out.push(scores.map((s) => `- ${criterionLabel(s.criterion)}: ${s.score}/10 (weight ${s.weight})`).join("\n"));
      for (const [q, a] of Object.entries((ev.answers ?? {}) as Record<string, string>)) if (md(a)) out.push(`- **${questionText(q)}** ${md(a)}`);
      if (md(ev.uncertainties)) out.push(`- **Uncertainties:** ${md(ev.uncertainties)}`);
      out.push("");
    }
    const decs = data.decisions.filter((x) => x.ideaId === idea.id);
    if (decs.length) out.push(`#### Decisions`, ...decs.map((x) => `- ${d(x.decidedAt)} — **${outcomeLabel(x.outcome)}**${md(x.rationale) ? `: ${md(x.rationale)}` : ""}`), "");
  }

  out.push(`## Inbox thoughts`, "");
  for (const t of live(data.thoughts)) {
    const tags = data.thoughtTags.filter((x) => x.thoughtId === t.id).map((x) => `#${tagName.get(x.tagId)}`);
    out.push(`- (${d(t.createdAt)}, ${thoughtTypeLabel(t.type)}, ${t.status.toLowerCase()}) ${md(t.content).replace(/\n/g, "\n  ")}${tags.length ? ` ${tags.join(" ")}` : ""}`);
  }
  out.push("", `## Projects`, "");
  for (const p of live(data.projects)) {
    out.push(`### ${p.name}`, `- Status: ${projectStatusLabel(p.status)}${p.deadline ? ` · Deadline ${d(p.deadline)}` : ""}`, "");
    if (md(p.objective)) out.push(`**Objective:** ${md(p.objective)}`, "");
    if (md(p.expectedOutcome)) out.push(`**Expected outcome:** ${md(p.expectedOutcome)}`, "");
    if (md(p.description)) out.push(md(p.description), "");
    const ms = data.milestones.filter((m) => m.projectId === p.id);
    if (ms.length) out.push(`#### Milestones`, ...ms.map((m) => `- [${m.done ? "x" : " "}] ${m.title}${m.dueDate ? ` (due ${d(m.dueDate)})` : ""}`), "");
    const ts = data.tasks.filter((t) => t.projectId === p.id);
    if (ts.length) out.push(`#### Tasks`, ...ts.map((t) => `- [${t.done ? "x" : " "}] ${t.title}${t.dueDate ? ` (due ${d(t.dueDate)})` : ""}`), "");
    if (md(p.notes)) out.push(`#### Notes`, md(p.notes), "");
  }
  out.push(`## Goals`, "");
  for (const g of live(data.goals)) {
    out.push(`### ${g.title}`, `- ${goalKindLabel(g.kind)} · ${g.status.toLowerCase()} · ${g.progress}%${g.targetDate ? ` · Target ${d(g.targetDate)}` : ""}`, "");
    if (md(g.whyItMatters)) out.push(`**Why it matters:** ${md(g.whyItMatters)}`, "");
    const ms = data.milestones.filter((m) => m.goalId === g.id);
    if (ms.length) out.push(...ms.map((m) => `- [${m.done ? "x" : " "}] ${m.title}`), "");
    if (md(g.notes)) out.push(md(g.notes), "");
  }
  out.push(`## Reflections`, "");
  for (const r of data.reflections) {
    out.push(`### ${r.title || r.kind.toLowerCase()} — ${d(r.weekOf ?? r.createdAt)}`, "");
    for (const [k, v] of Object.entries((r.answers ?? {}) as Record<string, string>)) if (md(v)) out.push(`**${k}:** ${md(v)}`, "");
    if (md(r.content)) out.push(md(r.content), "");
  }
  return out.join("\n");
}

/**
 * Merge-import a JSON export into the current account. Records keep their ids;
 * any id that already exists is skipped, so importing the same file twice is safe.
 */
export async function importJSON(userId: string, payload: unknown) {
  const p = payload as ExportPayload;
  if (!p || typeof p !== "object" || p.app !== "mindspace" || typeof p.version !== "number" || !p.data) {
    throw new ValidationError("This doesn't look like a Mindspace export file");
  }
  if (p.version > EXPORT_VERSION) throw new ValidationError("This export was made by a newer version of Mindspace");
  const x = p.data;
  const mine = <T extends object>(rows: T[] | undefined) => (rows ?? []).map((r) => ({ ...r, userId }));
  const counts: Record<string, number> = {};

  await db.$transaction(
    async (tx) => {
      const run = async (name: string, fn: () => Promise<{ count: number }>) => {
        counts[name] = (await fn()).count;
      };
      // Tags/categories are unique by name per user; resolve conflicts by name.
      const existingTags = new Map((await tx.tag.findMany({ where: { userId } })).map((t) => [t.name, t.id]));
      const tagIdMap = new Map<string, string>();
      const newTags = (x.tags ?? []).filter((t) => {
        const hit = existingTags.get(t.name);
        if (hit) tagIdMap.set(t.id, hit);
        return !hit;
      });
      await run("tags", () => tx.tag.createMany({ data: mine(newTags), skipDuplicates: true }));
      const existingCats = new Map((await tx.category.findMany({ where: { userId } })).map((c) => [c.name, c.id]));
      const catIdMap = new Map<string, string>();
      const newCats = (x.categories ?? []).filter((c) => {
        const hit = existingCats.get(c.name);
        if (hit) catIdMap.set(c.id, hit);
        return !hit;
      });
      await run("categories", () => tx.category.createMany({ data: mine(newCats), skipDuplicates: true }));
      const tagId = (id: string) => tagIdMap.get(id) ?? id;

      await run("thoughts", () => tx.thought.createMany({ data: mine(x.thoughts), skipDuplicates: true }));
      await run("ideas", () =>
        tx.idea.createMany({
          data: mine(x.ideas).map((i) => ({ ...i, categoryId: i.categoryId ? catIdMap.get(i.categoryId) ?? i.categoryId : null, references: i.references as Prisma.InputJsonValue })),
          skipDuplicates: true,
        }),
      );
      await run("goals", () => tx.goal.createMany({ data: mine(x.goals), skipDuplicates: true }));
      await run("projects", () => tx.project.createMany({ data: mine(x.projects), skipDuplicates: true }));

      // Child rows: only attach to parents owned by this user.
      const own = async () => ({
        thoughts: new Set((await tx.thought.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id)),
        ideas: new Set((await tx.idea.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id)),
        projects: new Set((await tx.project.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id)),
        goals: new Set((await tx.goal.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id)),
        tags: new Set((await tx.tag.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id)),
      });
      const o = await own();
      await run("thoughtTags", () => tx.thoughtTag.createMany({ data: (x.thoughtTags ?? []).map((t) => ({ ...t, tagId: tagId(t.tagId) })).filter((t) => o.thoughts.has(t.thoughtId) && o.tags.has(t.tagId)), skipDuplicates: true }));
      await run("ideaTags", () => tx.ideaTag.createMany({ data: (x.ideaTags ?? []).map((t) => ({ ...t, tagId: tagId(t.tagId) })).filter((t) => o.ideas.has(t.ideaId) && o.tags.has(t.tagId)), skipDuplicates: true }));
      await run("ideaNotes", () => tx.ideaNote.createMany({ data: mine(x.ideaNotes).filter((n) => o.ideas.has(n.ideaId)), skipDuplicates: true }));
      await run("evaluations", () =>
        tx.evaluation.createMany({ data: mine(x.evaluations).filter((e) => o.ideas.has(e.ideaId)).map((e) => ({ ...e, answers: e.answers as Prisma.InputJsonValue })), skipDuplicates: true }),
      );
      const evIds = new Set((await tx.evaluation.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id));
      await run("evaluationScores", () => tx.evaluationScore.createMany({ data: (x.evaluationScores ?? []).filter((s) => evIds.has(s.evaluationId)), skipDuplicates: true }));
      await run("decisions", () =>
        tx.decision.createMany({ data: mine(x.decisions).filter((d) => o.ideas.has(d.ideaId)).map((d) => ({ ...d, evaluationId: d.evaluationId && evIds.has(d.evaluationId) ? d.evaluationId : null })), skipDuplicates: true }),
      );
      await run("milestones", () =>
        tx.milestone.createMany({ data: (x.milestones ?? []).filter((m) => (m.projectId && o.projects.has(m.projectId)) || (m.goalId && o.goals.has(m.goalId))), skipDuplicates: true }),
      );
      const msIds = new Set((await tx.milestone.findMany({ where: { OR: [{ project: { userId } }, { goal: { userId } }] }, select: { id: true } })).map((r) => r.id));
      await run("tasks", () =>
        tx.task.createMany({
          data: mine(x.tasks).filter((t) => !t.projectId || o.projects.has(t.projectId)).map((t) => ({ ...t, milestoneId: t.milestoneId && msIds.has(t.milestoneId) ? t.milestoneId : null })),
          skipDuplicates: true,
        }),
      );
      await run("reflections", () => tx.reflection.createMany({ data: mine(x.reflections).map((r) => ({ ...r, answers: r.answers as Prisma.InputJsonValue })), skipDuplicates: true }));
      await run("links", () => tx.entityLink.createMany({ data: mine(x.links), skipDuplicates: true }));
      await run("aiConversations", () => tx.aIConversation.createMany({ data: mine(x.aiConversations).filter((c) => !c.ideaId || o.ideas.has(c.ideaId)), skipDuplicates: true }));
      const convIds = new Set((await tx.aIConversation.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id));
      await run("aiMessages", () => tx.aIMessage.createMany({ data: (x.aiMessages ?? []).filter((m) => convIds.has(m.conversationId)), skipDuplicates: true }));

      if (p.settings?.scoringWeights) {
        await tx.settings.upsert({
          where: { userId },
          create: { userId, scoringWeights: p.settings.scoringWeights as Prisma.InputJsonValue },
          update: {},
        });
      }
    },
    { timeout: 60_000 },
  );
  return counts;
}
