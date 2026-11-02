"use server";
import { run } from "./_run";
import { saveAISettings, getAIConfig } from "@/server/services/settings";
import { chatCompletion } from "@/server/services/ai";
import { importJSON } from "@/server/services/backup";

export async function saveAI(input: { aiEnabled: boolean; aiProvider: "local" | "remote"; localModel?: string; aiBaseUrl: string; aiModel: string; aiApiKey?: string }) {
  return run(async (uid) => {
    await saveAISettings(uid, input);
    return null;
  }, ["/settings"]);
}

/** Sends a tiny, content-free prompt to verify the provider works. */
export async function testAI() {
  return run(async (uid) => {
    const cfg = await getAIConfig(uid);
    const reply = await chatCompletion(cfg, [{ role: "user", content: "Reply with the single word: ready" }]);
    return reply.slice(0, 100);
  });
}

export async function importBackup(json: string) {
  return run(async (uid) => {
    let payload: unknown;
    try {
      payload = JSON.parse(json);
    } catch {
      throw new Error("That file isn't valid JSON");
    }
    return importJSON(uid, payload);
  }, ["/", "/ideas", "/inbox", "/projects", "/goals", "/reflections"]);
}
