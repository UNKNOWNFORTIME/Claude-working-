import "server-only";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { requireUserId, UnauthorizedError } from "@/server/auth";
import { NotFoundError, ValidationError } from "@/server/services/errors";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/** Wraps a server action: authenticates, runs, maps errors to friendly messages, revalidates. */
export async function run<T>(fn: (userId: string) => Promise<T>, revalidate: string[] = []): Promise<ActionResult<T>> {
  try {
    const userId = await requireUserId();
    const data = await fn(userId);
    for (const p of revalidate) revalidatePath(p, p.endsWith("]") ? "page" : undefined);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof UnauthorizedError) return "Your session has expired. Please sign in again.";
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Invalid input";
  if (e instanceof NotFoundError || e instanceof ValidationError) return e.message;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "That already exists.";
    if (e.code === "P2025") return "Item not found.";
  }
  if (e instanceof Prisma.PrismaClientInitializationError) return "Can't reach the database right now.";
  console.error(e);
  return e instanceof Error && e.message.length < 200 ? e.message : "Something went wrong. Please try again.";
}
