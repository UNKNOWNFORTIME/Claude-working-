import { db } from "@/lib/db";
import { reflectionSchema } from "@/lib/validation";
import { entityExists } from "./links";
import { NotFoundError } from "./errors";
import type { EntityType, ReflectionKind } from "@prisma/client";

export async function saveReflection(userId: string, id: string | null, input: unknown) {
  const d = reflectionSchema.parse(input);
  if (d.entityType && d.entityId && !(await entityExists(userId, d.entityType, d.entityId))) throw new NotFoundError("Item");
  const data = {
    kind: d.kind,
    title: d.title ?? "",
    content: d.content ?? "",
    answers: d.answers ?? {},
    weekOf: d.weekOf ?? null,
    entityType: d.entityType ?? null,
    entityId: d.entityId ?? null,
  };
  if (id) {
    const res = await db.reflection.updateMany({ where: { id, userId }, data });
    if (!res.count) throw new NotFoundError("Reflection");
    return db.reflection.findUniqueOrThrow({ where: { id } });
  }
  return db.reflection.create({ data: { userId, ...data } });
}

export async function deleteReflection(userId: string, id: string) {
  const res = await db.reflection.deleteMany({ where: { id, userId } });
  if (!res.count) throw new NotFoundError("Reflection");
}

export async function listReflections(userId: string, opts: { kind?: ReflectionKind; entityType?: EntityType; entityId?: string } = {}) {
  return db.reflection.findMany({
    where: { userId, kind: opts.kind, entityType: opts.entityType, entityId: opts.entityId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getWeeklyReflection(userId: string, weekOf: Date) {
  return db.reflection.findFirst({ where: { userId, kind: "WEEKLY", weekOf } });
}
