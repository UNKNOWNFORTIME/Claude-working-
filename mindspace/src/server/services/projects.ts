import { db } from "@/lib/db";
import { milestoneSchema, projectCreateSchema, projectUpdateSchema, taskSchema } from "@/lib/validation";
import { ownedIdea } from "./ideas";
import { canonicalPair } from "./links";
import { NotFoundError } from "./errors";
import type { Prisma, ProjectStatus } from "@prisma/client";

export async function ownedProject(userId: string, id: string) {
  const p = await db.project.findFirst({ where: { id, userId, deletedAt: null } });
  if (!p) throw new NotFoundError("Project");
  return p;
}

export async function createProject(userId: string, input: unknown) {
  const d = projectCreateSchema.parse(input);
  if (d.ideaId) await ownedIdea(userId, d.ideaId);
  return db.project.create({
    data: {
      userId,
      name: d.name,
      description: d.description ?? "",
      objective: d.objective ?? "",
      expectedOutcome: d.expectedOutcome ?? "",
      status: d.status ?? "PLANNED",
      deadline: d.deadline ?? null,
      ideaId: d.ideaId ?? null,
    },
  });
}

/** Flow C: turns an idea into a linked project and moves the idea to In Progress. */
export async function convertIdeaToProject(userId: string, ideaId: string) {
  const idea = await ownedIdea(userId, ideaId);
  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        userId,
        ideaId,
        name: idea.title,
        description: idea.summary || idea.description.slice(0, 2000),
        objective: "",
        status: "PLANNED",
      },
    });
    await tx.idea.update({ where: { id: ideaId }, data: { stage: "IN_PROGRESS" } });
    await tx.entityLink.upsert({
      where: { userId_aType_aId_bType_bId: { userId, ...canonicalPair("IDEA", ideaId, "PROJECT", project.id) } },
      create: { userId, ...canonicalPair("IDEA", ideaId, "PROJECT", project.id) },
      update: {},
    });
    return project;
  });
}

export async function updateProject(userId: string, id: string, input: unknown) {
  const d = projectUpdateSchema.parse(input);
  await ownedProject(userId, id);
  if (d.ideaId) await ownedIdea(userId, d.ideaId);
  return db.project.update({ where: { id }, data: d });
}

export const projectListInclude = {
  idea: { select: { id: true, title: true } },
  tasks: { select: { done: true } },
  milestones: { select: { done: true, dueDate: true, title: true }, orderBy: { position: "asc" } },
} satisfies Prisma.ProjectInclude;

export async function listProjects(userId: string, opts: { status?: ProjectStatus | "OPEN" | "ALL"; q?: string } = {}) {
  const where: Prisma.ProjectWhereInput = { userId, deletedAt: null };
  if (opts.status === "OPEN" || !opts.status) where.status = { in: ["PLANNED", "ACTIVE", "PAUSED"] };
  else if (opts.status !== "ALL") where.status = opts.status;
  if (opts.q) where.name = { contains: opts.q, mode: "insensitive" };
  return db.project.findMany({ where, include: projectListInclude, orderBy: { updatedAt: "desc" } });
}

export function projectProgress(p: { tasks: { done: boolean }[]; milestones: { done: boolean }[] }) {
  const items = [...p.tasks, ...p.milestones];
  if (!items.length) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

export async function getProjectDetail(userId: string, id: string) {
  const p = await db.project.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      idea: { select: { id: true, title: true, latestScore: true, deletedAt: true } },
      milestones: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
      tasks: { orderBy: [{ done: "asc" }, { position: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!p) throw new NotFoundError("Project");
  return p;
}

// --- Milestones (project or goal) ---

async function assertMilestoneParent(userId: string, parent: { projectId?: string; goalId?: string }) {
  if (parent.projectId) await ownedProject(userId, parent.projectId);
  else if (parent.goalId) {
    const g = await db.goal.findFirst({ where: { id: parent.goalId, userId, deletedAt: null }, select: { id: true } });
    if (!g) throw new NotFoundError("Goal");
  } else throw new NotFoundError("Parent");
}

async function ownedMilestone(userId: string, id: string) {
  const m = await db.milestone.findFirst({
    where: { id, OR: [{ project: { userId } }, { goal: { userId } }] },
  });
  if (!m) throw new NotFoundError("Milestone");
  return m;
}

export async function addMilestone(userId: string, parent: { projectId?: string; goalId?: string }, input: unknown) {
  const d = milestoneSchema.parse(input);
  await assertMilestoneParent(userId, parent);
  const count = await db.milestone.count({ where: parent });
  return db.milestone.create({ data: { ...parent, title: d.title, dueDate: d.dueDate ?? null, position: count } });
}

export async function updateMilestone(userId: string, id: string, input: { title?: string; dueDate?: string | null; done?: boolean }) {
  await ownedMilestone(userId, id);
  const d = milestoneSchema.partial().parse(input);
  return db.milestone.update({ where: { id }, data: { ...d, done: typeof input.done === "boolean" ? input.done : undefined } });
}

export async function deleteMilestone(userId: string, id: string) {
  await ownedMilestone(userId, id);
  await db.milestone.delete({ where: { id } });
}

// --- Tasks ---

async function ownedTask(userId: string, id: string) {
  const t = await db.task.findFirst({ where: { id, userId } });
  if (!t) throw new NotFoundError("Task");
  return t;
}

export async function addTask(userId: string, projectId: string, input: unknown) {
  const d = taskSchema.parse(input);
  await ownedProject(userId, projectId);
  if (d.milestoneId) {
    const m = await db.milestone.findFirst({ where: { id: d.milestoneId, projectId } });
    if (!m) throw new NotFoundError("Milestone");
  }
  const count = await db.task.count({ where: { projectId } });
  const task = await db.task.create({
    data: { userId, projectId, title: d.title, dueDate: d.dueDate ?? null, milestoneId: d.milestoneId ?? null, position: count },
  });
  await db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  return task;
}

export async function updateTask(userId: string, id: string, input: { title?: string; dueDate?: string | null; done?: boolean; milestoneId?: string | null }) {
  const t = await ownedTask(userId, id);
  const d = taskSchema.partial().parse({ title: input.title, dueDate: input.dueDate, milestoneId: input.milestoneId });
  const done = typeof input.done === "boolean" ? input.done : undefined;
  const task = await db.task.update({
    where: { id },
    data: { ...d, done, completedAt: done === undefined ? undefined : done ? new Date() : null },
  });
  if (t.projectId) await db.project.update({ where: { id: t.projectId }, data: { updatedAt: new Date() } });
  return task;
}

export async function deleteTask(userId: string, id: string) {
  await ownedTask(userId, id);
  await db.task.delete({ where: { id } });
}

export async function upcomingTasks(userId: string, take = 8) {
  return db.task.findMany({
    where: { userId, done: false, project: { deletedAt: null, status: { in: ["PLANNED", "ACTIVE"] } } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take,
  });
}
