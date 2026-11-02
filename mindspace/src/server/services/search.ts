import { db } from "@/lib/db";

export type SearchKind = "thought" | "idea" | "project" | "goal" | "evaluation" | "note" | "reflection";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  snippet: string;
  href: string;
  updatedAt: Date;
}

function snippet(text: string, q: string, len = 140) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, len);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + text.slice(start, start + len).replace(/\s+/g, " ") + (start + len < text.length ? "…" : "");
}

/** Case-insensitive search across everything I've written. */
export async function globalSearch(userId: string, rawQ: string, opts: { kinds?: SearchKind[]; take?: number } = {}): Promise<SearchHit[]> {
  const q = rawQ.trim().slice(0, 200);
  if (!q) return [];
  const take = opts.take ?? 20;
  const want = (k: SearchKind) => !opts.kinds?.length || opts.kinds.includes(k);
  const c = { contains: q, mode: "insensitive" as const };
  const base = { userId, deletedAt: null };

  const [thoughts, ideas, projects, goals, evaluations, notes, reflections] = await Promise.all([
    want("thought") ? db.thought.findMany({ where: { ...base, OR: [{ content: c }, { tags: { some: { tag: { name: c } } } }] }, take, orderBy: { updatedAt: "desc" } }) : [],
    want("idea") ? db.idea.findMany({ where: { ...base, OR: [{ title: c }, { summary: c }, { description: c }, { motivation: c }, { tags: { some: { tag: { name: c } } } }] }, take, orderBy: { updatedAt: "desc" } }) : [],
    want("project") ? db.project.findMany({ where: { ...base, OR: [{ name: c }, { description: c }, { objective: c }, { notes: c }] }, take, orderBy: { updatedAt: "desc" } }) : [],
    want("goal") ? db.goal.findMany({ where: { ...base, OR: [{ title: c }, { whyItMatters: c }, { notes: c }] }, take, orderBy: { updatedAt: "desc" } }) : [],
    want("evaluation")
      ? db.$queryRaw<{ id: string; ideaId: string; title: string; text: string; updatedAt: Date }[]>`
          SELECT e.id, e."ideaId", i.title, (e.answers::text || ' ' || e.uncertainties) AS text, e."updatedAt"
          FROM "Evaluation" e JOIN "Idea" i ON i.id = e."ideaId"
          WHERE e."userId" = ${userId}::uuid AND i."deletedAt" IS NULL
            AND (e.answers::text ILIKE ${"%" + q + "%"} OR e.uncertainties ILIKE ${"%" + q + "%"})
          ORDER BY e."updatedAt" DESC LIMIT ${take}`
      : [],
    want("note") ? db.ideaNote.findMany({ where: { userId, content: c, idea: { deletedAt: null } }, include: { idea: { select: { title: true } } }, take, orderBy: { updatedAt: "desc" } }) : [],
    want("reflection") ? db.reflection.findMany({ where: { userId, OR: [{ title: c }, { content: c }] }, take, orderBy: { updatedAt: "desc" } }) : [],
  ]);

  const hits: SearchHit[] = [
    ...ideas.map((i) => ({ kind: "idea" as const, id: i.id, title: i.title, snippet: snippet(i.summary || i.description, q), href: `/ideas/${i.id}`, updatedAt: i.updatedAt })),
    ...thoughts.map((t) => ({ kind: "thought" as const, id: t.id, title: t.content.split("\n")[0].slice(0, 100), snippet: snippet(t.content, q), href: `/inbox?thought=${t.id}`, updatedAt: t.updatedAt })),
    ...projects.map((p) => ({ kind: "project" as const, id: p.id, title: p.name, snippet: snippet(p.description || p.objective, q), href: `/projects/${p.id}`, updatedAt: p.updatedAt })),
    ...goals.map((g) => ({ kind: "goal" as const, id: g.id, title: g.title, snippet: snippet(g.whyItMatters || g.notes, q), href: `/goals/${g.id}`, updatedAt: g.updatedAt })),
    ...evaluations.map((e) => ({
      kind: "evaluation" as const, id: e.id, title: `Evaluation · ${e.title}`,
      snippet: snippet(e.text.replace(/[{}"]/g, " ").replace(/\b[a-z]+\.[a-zA-Z]+\b:/g, ""), q),
      href: `/ideas/${e.ideaId}/evaluations/${e.id}`, updatedAt: e.updatedAt,
    })),
    ...notes.map((n) => ({ kind: "note" as const, id: n.id, title: `Note · ${n.idea.title}`, snippet: snippet(n.content, q), href: `/ideas/${n.ideaId}?tab=notes`, updatedAt: n.updatedAt })),
    ...reflections.map((r) => ({ kind: "reflection" as const, id: r.id, title: r.title || "Reflection", snippet: snippet(r.content, q), href: `/reflections?r=${r.id}`, updatedAt: r.updatedAt })),
  ];
  return hits;
}
