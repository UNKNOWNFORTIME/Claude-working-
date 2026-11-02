import { db } from "@/lib/db";
import { goalCreateSchema, goalUpdateSchema } from "@/lib/validation";
import { NotFoundError } from "./errors";
import type { GoalKind, GoalStatus, Prisma } from "@prisma/client";

export async function ownedGoal(userId: string, id: string) {
  const g = await db.goal.findFirst({ where: { id, userId, deletedAt: null } });
  if (!g) throw new NotFoundError("Goal");
  return g;
}

export async function createGoal(userId: string, input: unknown) {
  const d = goalCreateSchema.parse(input);
  return db.goal.create({
    data: { userId, title: d.title, kind: d.kind ?? "PERSONAL", whyItMatters: d.whyItMatters ?? "", targetDate: d.targetDate ?? null },
  });
}

export async function updateGoal(userId: string, id: string, input: unknown) {
  const d = goalUpdateSchema.parse(input);
  await ownedGoal(userId, id);
  return db.goal.update({ where: { id }, data: d });
}

export async function listGoals(userId: string, opts: { status?: GoalStatus | "ALL"; kind?: GoalKind } = {}) {
  const where: Prisma.GoalWhereInput = { userId, deletedAt: null };
  if (!opts.status) where.status = "ACTIVE";
  else if (opts.status !== "ALL") where.status = opts.status;
  if (opts.kind) where.kind = opts.kind;
  return db.goal.findMany({
    where,
    include: { milestones: { select: { done: true } } },
    orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
  });
}

export async function getGoalDetail(userId: string, id: string) {
  const g = await db.goal.findFirst({
    where: { id, userId, deletedAt: null },
    include: { milestones: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  if (!g) throw new NotFoundError("Goal");
  return g;
}
