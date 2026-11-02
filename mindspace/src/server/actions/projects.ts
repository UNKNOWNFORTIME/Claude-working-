"use server";
import { run } from "./_run";
import * as svc from "@/server/services/projects";
import { moveToTrash } from "@/server/services/trash";

const p = (id?: string) => ["/", "/projects", ...(id ? [`/projects/${id}`] : [])];

export async function createProject(input: Record<string, unknown>) {
  return run(async (uid) => ({ id: (await svc.createProject(uid, input)).id }), p());
}
export async function updateProject(id: string, input: Record<string, unknown>) {
  return run(async (uid) => {
    await svc.updateProject(uid, id, input);
    return null;
  }, p(id));
}
export async function trashProject(id: string) {
  return run(async (uid) => {
    await moveToTrash(uid, "PROJECT", id);
    return null;
  }, [...p(), "/archive"]);
}
export async function addMilestone(parent: { projectId?: string; goalId?: string }, input: { title: string; dueDate?: string | null }) {
  return run(async (uid) => {
    await svc.addMilestone(uid, parent, input);
    return null;
  }, parent.projectId ? p(parent.projectId) : ["/goals", `/goals/${parent.goalId}`]);
}
export async function updateMilestone(id: string, input: { title?: string; dueDate?: string | null; done?: boolean }, path: string) {
  return run(async (uid) => {
    await svc.updateMilestone(uid, id, input);
    return null;
  }, [path, "/"]);
}
export async function deleteMilestone(id: string, path: string) {
  return run(async (uid) => {
    await svc.deleteMilestone(uid, id);
    return null;
  }, [path]);
}
export async function addTask(projectId: string, input: { title: string; dueDate?: string | null; milestoneId?: string | null }) {
  return run(async (uid) => {
    await svc.addTask(uid, projectId, input);
    return null;
  }, p(projectId));
}
export async function updateTask(id: string, input: { title?: string; dueDate?: string | null; done?: boolean; milestoneId?: string | null }, projectId?: string) {
  return run(async (uid) => {
    await svc.updateTask(uid, id, input);
    return null;
  }, p(projectId));
}
export async function deleteTask(id: string, projectId: string) {
  return run(async (uid) => {
    await svc.deleteTask(uid, id);
    return null;
  }, p(projectId));
}
