"use server";
import { run } from "./_run";
import * as links from "@/server/services/links";
import * as tax from "@/server/services/taxonomy";
import * as trash from "@/server/services/trash";
import * as refl from "@/server/services/reflections";
import { globalSearch, type SearchKind } from "@/server/services/search";
import type { EntityType } from "@prisma/client";

export async function linkItems(input: { fromType: EntityType; fromId: string; toType: EntityType; toId: string; note?: string }, path: string) {
  return run(async (uid) => {
    await links.createLink(uid, input);
    return null;
  }, [path]);
}
export async function unlinkItems(id: string, path: string) {
  return run(async (uid) => {
    await links.deleteLink(uid, id);
    return null;
  }, [path]);
}
export async function searchLinkCandidates(q: string) {
  return run((uid) => links.linkCandidates(uid, q));
}
export async function quickSearch(q: string, kinds?: SearchKind[]) {
  return run(async (uid) => (await globalSearch(uid, q, { kinds, take: 6 })).slice(0, 20));
}

export async function createCategory(input: { name: string; color?: string }) {
  return run(async (uid) => {
    const c = await tax.createCategory(uid, input);
    return { id: c.id, name: c.name, color: c.color };
  }, ["/settings", "/ideas"]);
}
export async function updateCategory(id: string, input: { name: string; color?: string }) {
  return run(async (uid) => {
    await tax.updateCategory(uid, id, input);
    return null;
  }, ["/settings", "/ideas"]);
}
export async function deleteCategory(id: string) {
  return run(async (uid) => {
    await tax.deleteCategory(uid, id);
    return null;
  }, ["/settings", "/ideas"]);
}
export async function deleteTag(id: string) {
  return run(async (uid) => {
    await tax.deleteTag(uid, id);
    return null;
  }, ["/settings"]);
}

export async function restoreItem(type: EntityType, id: string) {
  return run(async (uid) => {
    await trash.restoreFromTrash(uid, type, id);
    return null;
  }, ["/archive", "/", "/ideas", "/projects", "/goals", "/inbox"]);
}
export async function trashItem(type: EntityType, id: string) {
  return run(async (uid) => {
    await trash.moveToTrash(uid, type, id);
    return null;
  }, ["/archive", "/", "/ideas", "/projects", "/goals", "/inbox"]);
}
export async function deleteForever(type: EntityType, id: string) {
  return run(async (uid) => {
    await trash.deletePermanently(uid, type, id);
    return null;
  }, ["/archive"]);
}
export async function emptyTrash() {
  return run((uid) => trash.emptyTrash(uid), ["/archive"]);
}

export async function saveReflection(id: string | null, input: Record<string, unknown>) {
  return run(async (uid) => {
    const r = await refl.saveReflection(uid, id, input);
    return { id: r.id };
  }, ["/reflections"]);
}
export async function deleteReflection(id: string, path = "/reflections") {
  return run(async (uid) => {
    await refl.deleteReflection(uid, id);
    return null;
  }, [path, "/reflections"]);
}
