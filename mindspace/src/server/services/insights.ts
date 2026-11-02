import { db } from "@/lib/db";
import { normalizeTag } from "./taxonomy";

const DAY = 86_400_000;
const STOP = new Set("the a an and or but if of to in on for with at by from is are was were be been i me my we you it this that these those what which who how why should would could can will just about into than then so as not do does did have has had more some any all maybe want need make get like really also very over works thing things something through there their them they when where while still even only".split(" "));

/** Words/tags that keep coming back across thoughts and ideas. */
export async function recurringThemes(userId: string) {
  const since = new Date(Date.now() - 180 * DAY);
  const [thoughts, ideas, tags] = await Promise.all([
    db.thought.findMany({ where: { userId, createdAt: { gte: since } }, select: { content: true } }),
    db.idea.findMany({ where: { userId, createdAt: { gte: since } }, select: { title: true, summary: true } }),
    db.tag.findMany({ where: { userId }, select: { name: true, _count: { select: { thoughts: true, ideas: true } } } }),
  ]);
  const counts = new Map<string, number>();
  for (const text of [...thoughts.map((t) => t.content), ...ideas.map((i) => `${i.title} ${i.summary}`)]) {
    const seen = new Set<string>();
    for (const w of text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []) {
      if (STOP.has(w) || seen.has(w)) continue;
      seen.add(w);
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  const words = [...counts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([word, count]) => ({ word, count }));
  const topTags = tags
    .map((t) => ({ name: normalizeTag(t.name), count: t._count.thoughts + t._count.ideas }))
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { words, topTags };
}

/** Active goals with no recent movement. */
export async function neglectedGoals(userId: string) {
  const goals = await db.goal.findMany({
    where: { userId, deletedAt: null, status: "ACTIVE", updatedAt: { lt: new Date(Date.now() - 30 * DAY) } },
    orderBy: { updatedAt: "asc" },
  });
  return goals;
}

export async function decisionSummary(userId: string) {
  const grouped = await db.decision.groupBy({ by: ["outcome"], where: { userId, idea: { deletedAt: null } }, _count: true });
  const [completedProjects, achievedGoals] = await Promise.all([
    db.project.findMany({ where: { userId, deletedAt: null, status: "COMPLETED" }, orderBy: { updatedAt: "desc" }, take: 10, select: { id: true, name: true, updatedAt: true } }),
    db.goal.findMany({ where: { userId, deletedAt: null, status: "ACHIEVED" }, orderBy: { updatedAt: "desc" }, take: 10, select: { id: true, title: true, updatedAt: true } }),
  ]);
  return { counts: Object.fromEntries(grouped.map((g) => [g.outcome, g._count])), completedProjects, achievedGoals };
}
