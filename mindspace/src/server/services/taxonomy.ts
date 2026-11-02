import { db } from "@/lib/db";
import { categorySchema } from "@/lib/validation";
import { NotFoundError } from "./errors";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof db;

export function normalizeTag(name: string) {
  return name.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, 40);
}

/** Find-or-create tags by name for a user, returning their ids. */
export async function ensureTags(userId: string, names: string[], tx: Tx = db) {
  const clean = [...new Set(names.map(normalizeTag).filter(Boolean))];
  if (!clean.length) return [];
  await tx.tag.createMany({ data: clean.map((name) => ({ userId, name })), skipDuplicates: true });
  const tags = await tx.tag.findMany({ where: { userId, name: { in: clean } }, select: { id: true } });
  return tags.map((t) => t.id);
}

export async function listTags(userId: string) {
  return db.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { ideas: true, thoughts: true } } },
  });
}

export async function deleteTag(userId: string, id: string) {
  const res = await db.tag.deleteMany({ where: { id, userId } });
  if (!res.count) throw new NotFoundError("Tag");
}

export async function listCategories(userId: string) {
  return db.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { ideas: { where: { deletedAt: null } } } } },
  });
}

export async function createCategory(userId: string, input: unknown) {
  const data = categorySchema.parse(input);
  return db.category.create({ data: { ...data, userId } });
}

export async function updateCategory(userId: string, id: string, input: unknown) {
  const data = categorySchema.parse(input);
  const res = await db.category.updateMany({ where: { id, userId }, data });
  if (!res.count) throw new NotFoundError("Category");
}

export async function deleteCategory(userId: string, id: string) {
  const res = await db.category.deleteMany({ where: { id, userId } });
  if (!res.count) throw new NotFoundError("Category");
}

export async function assertCategory(userId: string, categoryId: string | null | undefined, tx: Tx = db) {
  if (!categoryId) return;
  const c = await tx.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
  if (!c) throw new NotFoundError("Category");
}
