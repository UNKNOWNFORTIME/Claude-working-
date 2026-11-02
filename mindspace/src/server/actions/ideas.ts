"use server";
import { run } from "./_run";
import * as svc from "@/server/services/ideas";
import { convertIdeaToProject } from "@/server/services/projects";
import { moveToTrash } from "@/server/services/trash";

export async function createIdea(input: { title: string; summary?: string; categoryId?: string | null; priority?: string; tags?: string[] }) {
  return run(async (uid) => ({ id: (await svc.createIdea(uid, input)).id }), ["/", "/ideas"]);
}

export async function updateIdea(id: string, input: Record<string, unknown>) {
  return run(async (uid) => {
    const idea = await svc.updateIdea(uid, id, input);
    return { updatedAt: idea.updatedAt };
  }, ["/ideas", `/ideas/${id}`]);
}

export async function addNote(ideaId: string, content: string) {
  return run(async (uid) => {
    await svc.addIdeaNote(uid, ideaId, content);
    return null;
  }, [`/ideas/${ideaId}`]);
}

export async function updateNote(ideaId: string, noteId: string, content: string) {
  return run(async (uid) => {
    await svc.updateIdeaNote(uid, noteId, content);
    return null;
  }, [`/ideas/${ideaId}`]);
}

export async function deleteNote(ideaId: string, noteId: string) {
  return run(async (uid) => {
    await svc.deleteIdeaNote(uid, noteId);
    return null;
  }, [`/ideas/${ideaId}`]);
}

export async function ideaToProject(ideaId: string) {
  return run(async (uid) => ({ id: (await convertIdeaToProject(uid, ideaId)).id }), ["/", "/ideas", "/projects", `/ideas/${ideaId}`]);
}

export async function trashIdea(id: string) {
  return run(async (uid) => {
    await moveToTrash(uid, "IDEA", id);
    return null;
  }, ["/", "/ideas", "/archive"]);
}
