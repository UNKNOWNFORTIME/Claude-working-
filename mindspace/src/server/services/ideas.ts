import { db } from "@/lib/db";
import { ideaCreateSchema, ideaUpdateSchema } from "@/lib/validation";
import { PRIORITIES } from "@/lib/constants";
import { assertCategory, ensureTags } from "./taxonomy";
import { NotFoundError } from "./errors";
import type { IdeaStage, Prisma, Priority } from "@prisma/client";

export const ideaListInclude = {
  category: true,
  tags: { include: { tag: true } },
  _count: { select: { evaluations: true, notes: true } },
  decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
} satisfies Prisma.IdeaInclude;
export type IdeaListItem = Prisma.IdeaGetPayload<{ include: typeof ideaListInclude }>;

export async function ownedIdea(userId: string, id: string, opts: { includeDeleted?: boolean } = {}) {
  const idea = await db.idea.findFirst({
    where: { id, userId, ...(opts.includeDeleted ? {} : { deletedAt: null }) },
  });
  if (!idea) throw new NotFoundError("Idea");
  return idea;
}

export async function createIdea(userId: string, input: unknown) {
  const data = ideaCreateSchema.parse(input);
  return db.$transaction(async (tx) => {
    await assertCategory(userId, data.categoryId, tx);
    const tagIds = await ensureTags(userId, data.tags ?? [], tx);
    return tx.idea.create({
      data: {
        userId,
        title: data.title,
        summary: data.summary ?? "",
        description: data.description ?? "",
        categoryId: data.categoryId ?? null,
        priority: data.priority ?? "MEDIUM",
        stage: data.stage ?? "JUST_AN_IDEA",
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
  });
}

export async function updateIdea(userId: string, id: string, input: unknown) {
  const data = ideaUpdateSchema.parse(input);
  await ownedIdea(userId, id);
  return db.$transaction(async (tx) => {
    if (data.categoryId !== undefined) await assertCategory(userId, data.categoryId, tx);
    if (data.tags) {
      const tagIds = await ensureTags(userId, data.tags, tx);
      await tx.ideaTag.deleteMany({ where: { ideaId: id } });
      await tx.ideaTag.createMany({ data: tagIds.map((tagId) => ({ ideaId: id, tagId })) });
    }
    const { tags: _tags, references, ...rest } = data;
    return tx.idea.update({
      where: { id },
      data: { ...rest, ...(references ? { references } : {}) },
    });
  });
}

export type IdeaSort = "updated" | "created" | "oldest" | "priority" | "score" | "title";

export interface IdeaFilter {
  q?: string;
  stage?: IdeaStage | "ACTIVE" | "ALL";
  categoryId?: string;
  tag?: string;
  priority?: Priority;
  minScore?: number;
  maxScore?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  sort?: IdeaSort;
  take?: number;
}

export async function listIdeas(userId: string, f: IdeaFilter = {}) {
  const where: Prisma.IdeaWhereInput = { userId, deletedAt: null };
  if (!f.stage || f.stage === "ACTIVE") where.stage = { not: "ARCHIVED" };
  else if (f.stage !== "ALL") where.stage = f.stage;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.tag) where.tags = { some: { tag: { name: f.tag } } };
  if (f.priority) where.priority = f.priority;
  if (f.minScore !== undefined || f.maxScore !== undefined) {
    where.latestScore = { gte: f.minScore, lte: f.maxScore };
  }
  if (f.createdAfter || f.createdBefore) where.createdAt = { gte: f.createdAfter, lte: f.createdBefore };
  if (f.q) {
    where.OR = [
      { title: { contains: f.q, mode: "insensitive" } },
      { summary: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.IdeaOrderByWithRelationInput[] =
    f.sort === "created" ? [{ createdAt: "desc" }]
    : f.sort === "oldest" ? [{ createdAt: "asc" }]
    : f.sort === "score" ? [{ latestScore: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }]
    : f.sort === "title" ? [{ title: "asc" }]
    : [{ updatedAt: "desc" }];

  const ideas = await db.idea.findMany({ where, include: ideaListInclude, orderBy, take: f.take ?? 500 });
  if (f.sort === "priority") {
    const rank = (p: Priority) => PRIORITIES.find((x) => x.value === p)!.rank;
    ideas.sort((a, b) => rank(b.priority) - rank(a.priority) || b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  return ideas;
}

export async function getIdeaDetail(userId: string, id: string) {
  const idea = await db.idea.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      category: true,
      tags: { include: { tag: true } },
      notes: { orderBy: { createdAt: "desc" } },
      sourceThought: true,
      evaluations: { orderBy: { createdAt: "desc" }, include: { scores: true } },
      decisions: { orderBy: { decidedAt: "desc" }, include: { evaluation: { select: { id: true, overallScore: true } } } },
      projects: { where: { deletedAt: null }, select: { id: true, name: true, status: true } },
    },
  });
  if (!idea) throw new NotFoundError("Idea");
  return idea;
}
export type IdeaDetail = Awaited<ReturnType<typeof getIdeaDetail>>;

export async function addIdeaNote(userId: string, ideaId: string, content: string) {
  const text = content.trim();
  if (!text) throw new Error("Note can't be empty");
  await ownedIdea(userId, ideaId);
  const note = await db.ideaNote.create({ data: { userId, ideaId, content: text.slice(0, 50_000) } });
  await db.idea.update({ where: { id: ideaId }, data: { updatedAt: new Date() } });
  return note;
}

export async function updateIdeaNote(userId: string, noteId: string, content: string) {
  const text = content.trim();
  if (!text) throw new Error("Note can't be empty");
  const res = await db.ideaNote.updateMany({ where: { id: noteId, userId }, data: { content: text.slice(0, 50_000) } });
  if (!res.count) throw new NotFoundError("Note");
}

export async function deleteIdeaNote(userId: string, noteId: string) {
  const res = await db.ideaNote.deleteMany({ where: { id: noteId, userId } });
  if (!res.count) throw new NotFoundError("Note");
}
