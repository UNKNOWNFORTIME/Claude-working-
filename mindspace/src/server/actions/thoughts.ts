"use server";
import { run } from "./_run";
import * as svc from "@/server/services/thoughts";
import { moveToTrash } from "@/server/services/trash";
import type { ThoughtStatus } from "@prisma/client";

const paths = ["/", "/inbox"];

export async function captureThought(input: { content: string; type?: string | null; tags?: string[] }) {
  return run(async (uid) => {
    const t = await svc.createThought(uid, input);
    return { id: t.id };
  }, paths);
}

export async function updateThought(id: string, input: { content?: string; type?: string | null; tags?: string[]; pinned?: boolean }) {
  return run(async (uid) => {
    await svc.updateThought(uid, id, input);
    return null;
  }, paths);
}

export async function setThoughtStatus(id: string, status: ThoughtStatus) {
  return run(async (uid) => {
    await svc.setThoughtStatus(uid, id, status);
    return null;
  }, paths);
}

export async function thoughtToIdea(id: string) {
  return run(async (uid) => {
    const idea = await svc.convertThoughtToIdea(uid, id);
    return { id: idea.id };
  }, [...paths, "/ideas"]);
}

export async function thoughtToGoal(id: string) {
  return run(async (uid) => {
    const goal = await svc.convertThoughtToGoal(uid, id);
    return { id: goal.id };
  }, [...paths, "/goals"]);
}

export async function trashThought(id: string) {
  return run(async (uid) => {
    await moveToTrash(uid, "THOUGHT", id);
    return null;
  }, [...paths, "/archive"]);
}
