import { db } from "@/lib/db";
import { thoughtCreateSchema, thoughtUpdateSchema } from "@/lib/validation";
import { firstLine } from "@/lib/utils";
import { ensureTags } from "./taxonomy";
import { NotFoundError } from "./errors";
import { canonicalPair } from "./links";
import type { Prisma, ThoughtStatus, ThoughtType } from "@prisma/client";

export const thoughtInclude = { tags: { include: { tag: true } }, ideas: { select: { id: true, title: true, deletedAt: true } } } satisfies Prisma.ThoughtInclude;
export type ThoughtWithTags = Prisma.ThoughtGetPayload<{ include: typeof thoughtInclude }>;

async function owned(userId: string, id: string) {
  const t = await db.thought.findFirst({ where: { id, userId, deletedAt: null } });
  if (!t) throw new NotFoundError("Thought");
  return t;
}

export async function createThought(userId: string, input: unknown) {
  const data = thoughtCreateSchema.parse(input);
  return db.$transaction(async (tx) => {
    const tagIds = await ensureTags(userId, data.tags ?? [], tx);
    return tx.thought.create({
      data: {
        userId,
        content: data.content,
        type: data.type ?? null,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      include: thoughtInclude,
    });
  });
}

export async function updateThought(userId: string, id: string, input: unknown) {
  const data = thoughtUpdateSchema.parse(input);
  await owned(userId, id);
  return db.$transaction(async (tx) => {
    if (data.tags) {
      const tagIds = await ensureTags(userId, data.tags, tx);
      await tx.thoughtTag.deleteMany({ where: { thoughtId: id } });
      await tx.thoughtTag.createMany({ data: tagIds.map((tagId) => ({ thoughtId: id, tagId })) });
    }
    return tx.thought.update({
      where: { id },
      data: { content: data.content, type: data.type, pinned: data.pinned },
      include: thoughtInclude,
    });
  });
}

export interface ThoughtFilter {
  status?: ThoughtStatus | "ALL";
  type?: ThoughtType | "UNCLASSIFIED";
  tag?: string;
  q?: string;
  take?: number;
}

export async function listThoughts(userId: string, f: ThoughtFilter = {}) {
  const where: Prisma.ThoughtWhereInput = { userId, deletedAt: null };
  if (f.status && f.status !== "ALL") where.status = f.status;
  if (!f.status) where.status = "INBOX";
  if (f.type === "UNCLASSIFIED") where.type = null;
  else if (f.type) where.type = f.type;
  if (f.tag) where.tags = { some: { tag: { name: f.tag } } };
  if (f.q) where.content = { contains: f.q, mode: "insensitive" };
  return db.thought.findMany({
    where,
    include: thoughtInclude,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: f.take ?? 200,
  });
}

export async function setThoughtStatus(userId: string, id: string, status: ThoughtStatus) {
  await owned(userId, id);
  return db.thought.update({ where: { id }, data: { status } });
}

/**
 * Creates an idea from a thought. The thought's original content is copied
 * into the idea description and left untouched on the thought itself.
 */
export async function convertThoughtToIdea(userId: string, id: string, overrides: { title?: string } = {}) {
  const thought = await owned(userId, id);
  const tags = await db.thoughtTag.findMany({ where: { thoughtId: id }, select: { tagId: true } });
  const title = (overrides.title?.trim() || firstLine(thought.content, 90)).slice(0, 200);
  return db.$transaction(async (tx) => {
    const idea = await tx.idea.create({
      data: {
        userId,
        title,
        summary: thought.content.length <= 280 ? thought.content : "",
        description: thought.content,
        sourceThoughtId: thought.id,
        tags: { create: tags.map((t) => ({ tagId: t.tagId })) },
      },
    });
    await tx.thought.update({ where: { id }, data: { status: "PROCESSED", type: thought.type ?? "IDEA" } });
    return idea;
  });
}

export async function convertThoughtToGoal(userId: string, id: string) {
  const thought = await owned(userId, id);
  return db.$transaction(async (tx) => {
    const goal = await tx.goal.create({
      data: { userId, title: firstLine(thought.content, 120), notes: thought.content },
    });
    await tx.thought.update({ where: { id }, data: { status: "PROCESSED", type: thought.type ?? "GOAL" } });
    await tx.entityLink.create({
      data: { userId, ...canonicalPair("THOUGHT", thought.id, "GOAL", goal.id) },
    });
    return goal;
  });
}

