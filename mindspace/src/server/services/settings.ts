import { db } from "@/lib/db";
import { aiSettingsSchema } from "@/lib/validation";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export interface AIConfig {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey: string | null;
}

/** Resolves AI configuration: Settings first, then environment defaults. Server-only. */
export async function getAIConfig(userId: string): Promise<AIConfig> {
  const s = await db.settings.findUnique({ where: { userId } });
  const apiKey = (s?.aiApiKeyEnc ? decryptSecret(s.aiApiKeyEnc) : null) || process.env.AI_API_KEY || null;
  return {
    enabled: !!s?.aiEnabled,
    baseUrl: (s?.aiBaseUrl || process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
    model: s?.aiModel || process.env.AI_MODEL || "gpt-4o-mini",
    apiKey,
  };
}

/** Safe-for-client view of AI settings — never includes the key itself. */
export async function getAISettingsView(userId: string) {
  const s = await db.settings.findUnique({ where: { userId } });
  const cfg = await getAIConfig(userId);
  return {
    aiEnabled: !!s?.aiEnabled,
    aiBaseUrl: s?.aiBaseUrl ?? "",
    aiModel: s?.aiModel ?? "",
    hasStoredKey: !!s?.aiApiKeyEnc,
    hasEnvKey: !!process.env.AI_API_KEY,
    effectiveBaseUrl: cfg.baseUrl,
    effectiveModel: cfg.model,
    ready: cfg.enabled && !!cfg.apiKey,
  };
}
export type AISettingsView = Awaited<ReturnType<typeof getAISettingsView>>;

export async function saveAISettings(userId: string, input: unknown) {
  const d = aiSettingsSchema.parse(input);
  const keyUpdate = d.aiApiKey === undefined ? {} : { aiApiKeyEnc: d.aiApiKey ? encryptSecret(d.aiApiKey) : null };
  const data = { aiEnabled: d.aiEnabled, aiBaseUrl: d.aiBaseUrl || null, aiModel: d.aiModel || null, ...keyUpdate };
  await db.settings.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}
