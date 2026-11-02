"use client";
import { prepareAIAction, runAIAction, saveDeviceConversation } from "@/server/actions/ai";
import { deviceChat } from "@/lib/device-ai";
import type { AIActionId } from "@/server/services/ai-actions";

/**
 * Runs an AI action either on this device (phone/browser model) or through the
 * server's provider (built-in laptop model or an API). Returns the conversation id.
 */
export async function runIdeaAI(args: {
  ideaId: string;
  action: AIActionId;
  opts?: { compareWithId?: string; question?: string };
  deviceFile?: string | null;
  onToken?: (text: string) => void;
  onLoadProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!args.deviceFile) {
    const res = await runAIAction(args.ideaId, args.action, args.opts ?? {});
    return res.ok ? { ok: true, id: res.data.id } : res;
  }
  const prep = await prepareAIAction(args.ideaId, args.action, args.opts ?? {});
  if (!prep.ok) return prep;
  let reply: string;
  try {
    reply = await deviceChat(args.deviceFile, prep.data.messages, { onToken: args.onToken, signal: args.signal, onLoadProgress: args.onLoadProgress });
  } catch (e) {
    return { ok: false, error: `On-device AI failed: ${(e as Error).message}` };
  }
  if (!reply) return { ok: false, error: "The on-device model returned an empty reply" };
  const saved = await saveDeviceConversation(args.ideaId, {
    action: args.action,
    title: prep.data.title,
    model: args.deviceFile,
    messages: [...prep.data.messages, { role: "assistant", content: reply }],
  });
  return saved.ok ? { ok: true, id: saved.data.id } : saved;
}
