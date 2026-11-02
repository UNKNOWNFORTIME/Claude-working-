"use server";
import { z } from "zod";
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

// ---- On-device AI (model runs in the browser; the server only builds prompts and stores results) ----

const msg = z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(100_000) });

/** Returns the prompt for an action without sending it anywhere. */
export async function prepareAIAction(ideaId: string, action: AIActionId, opts: { compareWithId?: string; question?: string } = {}) {
  return run((uid) => ai.buildActionMessages(uid, ideaId, action, { ...opts, compact: true }));
}

export async function saveDeviceConversation(ideaId: string, input: { action: string; title: string; model: string; messages: { role: "system" | "user" | "assistant"; content: string }[] }) {
  return run(async (uid) => {
    const messages = z.array(msg).min(2).max(200).parse(input.messages);
    const conv = await ai.saveConversation(uid, ideaId, { action: z.string().max(40).parse(input.action), title: input.title, model: `on device · ${input.model}`, messages });
    return { id: conv.id };
  }, [`/ideas/${ideaId}`]);
}

export async function appendDeviceTurn(ideaId: string, conversationId: string, turns: { role: "user" | "assistant"; content: string }[]) {
  return run(async (uid) => {
    await ai.appendMessages(uid, conversationId, z.array(msg).min(1).max(10).parse(turns));
    return null;
  }, [`/ideas/${ideaId}`]);
}
