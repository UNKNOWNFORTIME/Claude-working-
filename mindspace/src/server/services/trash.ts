import { db } from "@/lib/db";
import { NotFoundError } from "./errors";
import type { EntityType } from "@prisma/client";

/** Soft-delete: the item disappears everywhere but can be restored from Trash. */
export async function moveToTrash(userId: string, type: EntityType, id: string) {
  const where = { id, userId, deletedAt: null };
  const data = { deletedAt: new Date() };
  const res =
    type === "IDEA" ? await db.idea.updateMany({ where, data })
    : type === "PROJECT" ? await db.project.updateMany({ where, data })
    : type === "GOAL" ? await db.goal.updateMany({ where, data })
    : await db.thought.updateMany({ where, data });
  if (!res.count) throw new NotFoundError("Item");
}

export async function restoreFromTrash(userId: string, type: EntityType, id: string) {
  const where = { id, userId, deletedAt: { not: null } };
  const data = { deletedAt: null };
  const res =
    type === "IDEA" ? await db.idea.updateMany({ where, data })
    : type === "PROJECT" ? await db.project.updateMany({ where, data })
    : type === "GOAL" ? await db.goal.updateMany({ where, data })
    : await db.thought.updateMany({ where, data });
  if (!res.count) throw new NotFoundError("Item");
}

async function purgeLinks(userId: string, type: EntityType, ids: string[]) {
  if (!ids.length) return;
  await db.entityLink.deleteMany({
    where: { userId, OR: [{ aType: type, aId: { in: ids } }, { bType: type, bId: { in: ids } }] },
  });
  await db.reflection.updateMany({ where: { userId, entityType: type, entityId: { in: ids } }, data: { entityType: null, entityId: null } });
}

/** Permanent deletion — only allowed for items already in Trash. */
export async function deletePermanently(userId: string, type: EntityType, id: string) {
  const where = { id, userId, deletedAt: { not: null } };
  const res =
    type === "IDEA" ? await db.idea.deleteMany({ where })
    : type === "PROJECT" ? await db.project.deleteMany({ where })
    : type === "GOAL" ? await db.goal.deleteMany({ where })
    : await db.thought.deleteMany({ where });
  if (!res.count) throw new NotFoundError("Item");
  await purgeLinks(userId, type, [id]);
}

export async function listTrash(userId: string) {
  const where = { userId, deletedAt: { not: null } };
  const [ideas, projects, goals, thoughts] = await Promise.all([
    db.idea.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    db.project.findMany({ where, select: { id: true, name: true, deletedAt: true } }),
    db.goal.findMany({ where, select: { id: true, title: true, deletedAt: true } }),
    db.thought.findMany({ where, select: { id: true, content: true, deletedAt: true } }),
  ]);
  return [
    ...ideas.map((i) => ({ type: "IDEA" as const, id: i.id, title: i.title, deletedAt: i.deletedAt! })),
    ...projects.map((p) => ({ type: "PROJECT" as const, id: p.id, title: p.name, deletedAt: p.deletedAt! })),
    ...goals.map((g) => ({ type: "GOAL" as const, id: g.id, title: g.title, deletedAt: g.deletedAt! })),
    ...thoughts.map((t) => ({ type: "THOUGHT" as const, id: t.id, title: t.content.slice(0, 140), deletedAt: t.deletedAt! })),
  ].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

export async function emptyTrash(userId: string) {
  const where = { userId, deletedAt: { not: null } };
  const trashed = await listTrash(userId);
  await db.$transaction([
    db.idea.deleteMany({ where }),
    db.project.deleteMany({ where }),
    db.goal.deleteMany({ where }),
    db.thought.deleteMany({ where }),
  ]);
  for (const type of ["IDEA", "PROJECT", "GOAL", "THOUGHT"] as const) {
    await purgeLinks(userId, type, trashed.filter((t) => t.type === type).map((t) => t.id));
  }
  return trashed.length;
}
