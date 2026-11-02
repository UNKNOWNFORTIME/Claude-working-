"use server";
import { run } from "./_run";
import * as ai from "@/server/services/ai";
import type { AIActionId } from "@/server/services/ai-actions";

export async function runAIAction(ideaId: string, action: AIActionId, opts: { compareWithId?: string; question?: string } = {}) {
  return run(async (uid) => {
    const conv = await ai.runIdeaAction(uid, ideaId, action, opts);
    return { id: conv.id };
  }, [`/ideas/${ideaId}`]);
}
export async function sendAIMessage(ideaId: string, conversationId: string, content: string) {
  return run(async (uid) => {
    await ai.continueConversation(uid, conversationId, content);
    return null;
  }, [`/ideas/${ideaId}`]);
}
export async function deleteAIConversation(ideaId: string, id: string) {
  return run(async (uid) => {
    await ai.deleteConversation(uid, id);
    return null;
  }, [`/ideas/${ideaId}`]);
}
