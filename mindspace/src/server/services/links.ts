import { db } from "@/lib/db";
import { linkSchema } from "@/lib/validation";
import { NotFoundError, ValidationError } from "./errors";
import type { EntityType } from "@prisma/client";

const ORDER: EntityType[] = ["GOAL", "IDEA", "PROJECT", "THOUGHT"];

/** Links are undirected; store endpoints in a canonical order. */
export function canonicalPair(t1: EntityType, id1: string, t2: EntityType, id2: string) {
  const k1 = `${ORDER.indexOf(t1)}:${id1}`;
  const k2 = `${ORDER.indexOf(t2)}:${id2}`;
  return k1 <= k2 ? { aType: t1, aId: id1, bType: t2, bId: id2 } : { aType: t2, aId: id2, bType: t1, bId: id1 };
}

export async function entityExists(userId: string, type: EntityType, id: string) {
  const where = { id, userId, deletedAt: null };
  switch (type) {
    case "IDEA":
      return !!(await db.idea.findFirst({ where, select: { id: true } }));
    case "PROJECT":
      return !!(await db.project.findFirst({ where, select: { id: true } }));
    case "GOAL":
      return !!(await db.goal.findFirst({ where, select: { id: true } }));
    case "THOUGHT":
      return !!(await db.thought.findFirst({ where, select: { id: true } }));
  }
}

export async function createLink(userId: string, input: unknown) {
  const d = linkSchema.parse(input);
  if (d.fromType === d.toType && d.fromId === d.toId) throw new ValidationError("An item can't be linked to itself");
  const [a, b] = await Promise.all([entityExists(userId, d.fromType, d.fromId), entityExists(userId, d.toType, d.toId)]);
  if (!a || !b) throw new NotFoundError("Item");
  const pair = canonicalPair(d.fromType, d.fromId, d.toType, d.toId);
  return db.entityLink.upsert({
    where: { userId_aType_aId_bType_bId: { userId, ...pair } },
    create: { userId, ...pair, note: d.note ?? "" },
    update: { note: d.note ?? undefined },
  });
}

export async function deleteLink(userId: string, id: string) {
  const res = await db.entityLink.deleteMany({ where: { id, userId } });
  if (!res.count) throw new NotFoundError("Link");
}

export interface RelatedItem {
  linkId: string;
  type: EntityType;
  id: string;
  title: string;
  subtitle: string;
  note: string;
}

/** Everything linked to an entity, resolved to titles (skips trashed items). */
export async function getRelated(userId: string, type: EntityType, id: string): Promise<RelatedItem[]> {
  const links = await db.entityLink.findMany({
    where: { userId, OR: [{ aType: type, aId: id }, { bType: type, bId: id }] },
    orderBy: { createdAt: "desc" },
  });
  const others = links.map((l) =>
    l.aType === type && l.aId === id
      ? { linkId: l.id, type: l.bType, id: l.bId, note: l.note }
      : { linkId: l.id, type: l.aType, id: l.aId, note: l.note },
  );
  const ids = (t: EntityType) => others.filter((o) => o.type === t).map((o) => o.id);
  const base = { userId, deletedAt: null };
  const [ideas, projects, goals, thoughts] = await Promise.all([
    db.idea.findMany({ where: { ...base, id: { in: ids("IDEA") } }, select: { id: true, title: true, stage: true } }),
    db.project.findMany({ where: { ...base, id: { in: ids("PROJECT") } }, select: { id: true, name: true, status: true } }),
    db.goal.findMany({ where: { ...base, id: { in: ids("GOAL") } }, select: { id: true, title: true, kind: true } }),
    db.thought.findMany({ where: { ...base, id: { in: ids("THOUGHT") } }, select: { id: true, content: true } }),
  ]);
  const lookup = new Map<string, { title: string; subtitle: string }>();
  ideas.forEach((i) => lookup.set(`IDEA:${i.id}`, { title: i.title, subtitle: i.stage }));
  projects.forEach((p) => lookup.set(`PROJECT:${p.id}`, { title: p.name, subtitle: p.status }));
  goals.forEach((g) => lookup.set(`GOAL:${g.id}`, { title: g.title, subtitle: g.kind }));
  thoughts.forEach((t) => lookup.set(`THOUGHT:${t.id}`, { title: t.content.slice(0, 120), subtitle: "" }));
  return others.flatMap((o) => {
    const hit = lookup.get(`${o.type}:${o.id}`);
    return hit ? [{ ...o, ...hit }] : [];
  });
}

/** Lightweight list of linkable items for pickers. */
export async function linkCandidates(userId: string, q: string) {
  const contains = { contains: q, mode: "insensitive" as const };
  const base = { userId, deletedAt: null };
  const [ideas, projects, goals] = await Promise.all([
    db.idea.findMany({ where: { ...base, title: contains }, select: { id: true, title: true }, take: 8, orderBy: { updatedAt: "desc" } }),
    db.project.findMany({ where: { ...base, name: contains }, select: { id: true, name: true }, take: 6, orderBy: { updatedAt: "desc" } }),
    db.goal.findMany({ where: { ...base, title: contains }, select: { id: true, title: true }, take: 6, orderBy: { updatedAt: "desc" } }),
  ]);
  return [
    ...ideas.map((i) => ({ type: "IDEA" as const, id: i.id, title: i.title })),
    ...projects.map((p) => ({ type: "PROJECT" as const, id: p.id, title: p.name })),
    ...goals.map((g) => ({ type: "GOAL" as const, id: g.id, title: g.title })),
  ];
}
