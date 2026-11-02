import { db } from "@/lib/db";
import { upcomingTasks } from "./projects";

const DAY = 86_400_000;

export async function getDashboard(userId: string) {
  const base = { userId, deletedAt: null };
  const now = new Date();
  const [recentThoughts, inboxCount, exploring, awaitingEvaluation, activeProjects, tasks, goals, revisitDue, researchDecisions, dormant, recentIdeas, recentProjects, recentGoals] =
    await Promise.all([
      db.thought.findMany({ where: { ...base, status: "INBOX" }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 6, include: { tags: { include: { tag: true } } } }),
      db.thought.count({ where: { ...base, status: "INBOX" } }),
      db.idea.findMany({ where: { ...base, stage: "EXPLORING" }, orderBy: { updatedAt: "desc" }, take: 5, include: { category: true } }),
      db.idea.findMany({
        where: { ...base, OR: [{ stage: "EVALUATING", evaluations: { none: { completedAt: { not: null } } } }, { stage: "JUST_AN_IDEA", createdAt: { lt: new Date(now.getTime() - 3 * DAY) } }] },
        orderBy: { createdAt: "asc" }, take: 5,
      }),
      db.project.findMany({ where: { ...base, status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 5, include: { tasks: { select: { done: true } }, milestones: { select: { done: true } } } }),
      upcomingTasks(userId, 6),
      db.goal.findMany({ where: { ...base, status: "ACTIVE" }, orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }], take: 5 }),
      // Revisit-later decisions whose revisit date has passed, or older than 60 days with no date
      db.idea.findMany({
        where: {
          ...base, stage: "ON_HOLD",
          decisions: { some: { outcome: "REVISIT_LATER", OR: [{ revisitAt: { lte: now } }, { revisitAt: null, decidedAt: { lt: new Date(now.getTime() - 60 * DAY) } }] } },
        },
        include: { decisions: { orderBy: { decidedAt: "desc" }, take: 1 } }, take: 5,
      }),
      db.idea.findMany({ where: { ...base, stage: "EXPLORING", decisions: { some: { outcome: "RESEARCH_FURTHER" } } }, include: { decisions: { orderBy: { decidedAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "asc" }, take: 5 }),
      db.idea.findMany({ where: { ...base, stage: { in: ["JUST_AN_IDEA", "EXPLORING", "WORTH_PURSUING"] }, updatedAt: { lt: new Date(now.getTime() - 45 * DAY) } }, orderBy: { updatedAt: "asc" }, take: 4 }),
      db.idea.findMany({ where: base, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, updatedAt: true } }),
      db.project.findMany({ where: base, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, name: true, updatedAt: true } }),
      db.goal.findMany({ where: base, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, title: true, updatedAt: true } }),
    ]);

  // Ideas marked "worth pursuing" that haven't become projects yet = decisions awaiting action
  const awaitingAction = await db.idea.findMany({
    where: { ...base, stage: "WORTH_PURSUING", projects: { none: { deletedAt: null } } },
    include: { decisions: { orderBy: { decidedAt: "desc" }, take: 1 } }, take: 5,
  });

  const recentlyUpdated = [
    ...recentIdeas.map((i) => ({ type: "IDEA" as const, id: i.id, title: i.title, updatedAt: i.updatedAt })),
    ...recentProjects.map((p) => ({ type: "PROJECT" as const, id: p.id, title: p.name, updatedAt: p.updatedAt })),
    ...recentGoals.map((g) => ({ type: "GOAL" as const, id: g.id, title: g.title, updatedAt: g.updatedAt })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 6);

  return { recentThoughts, inboxCount, exploring, awaitingEvaluation, activeProjects, tasks, goals, revisitDue, researchDecisions, awaitingAction, dormant, recentlyUpdated };
}
