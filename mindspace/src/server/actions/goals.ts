"use server";
import { run } from "./_run";
import * as svc from "@/server/services/goals";
import { moveToTrash } from "@/server/services/trash";

export async function createGoal(input: Record<string, unknown>) {
  return run(async (uid) => ({ id: (await svc.createGoal(uid, input)).id }), ["/", "/goals"]);
}
export async function updateGoal(id: string, input: Record<string, unknown>) {
  return run(async (uid) => {
    await svc.updateGoal(uid, id, input);
    return null;
  }, ["/", "/goals", `/goals/${id}`]);
}
export async function trashGoal(id: string) {
  return run(async (uid) => {
    await moveToTrash(uid, "GOAL", id);
    return null;
  }, ["/", "/goals", "/archive"]);
}
