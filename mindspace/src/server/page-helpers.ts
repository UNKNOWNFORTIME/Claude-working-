import "server-only";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/server/services/errors";
import { z } from "zod";

/** Turns a service NotFoundError (or malformed id) into a 404 page. */
export async function orNotFound<T>(p: () => Promise<T>): Promise<T> {
  try {
    return await p();
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

export function assertUuid(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
}
