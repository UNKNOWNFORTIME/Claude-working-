// Catalog of recommended offline models. Client-safe (no server imports).
// All are open-weight instruct models in GGUF format, quantized to Q4_K_M.

export type ModelTarget = "laptop" | "phone";

export interface ModelInfo {
  id: string;
  file: string;
  repo: string; // Hugging Face repository
  target: ModelTarget;
  label: string;
  sizeLabel: string;
  description: string;
  recommended?: boolean;
  /** Context window we run it with */
  contextSize: number;
  license: string;
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: "qwen2.5-3b",
    file: "qwen2.5-3b-instruct-q4_k_m.gguf",
    repo: "Qwen/Qwen2.5-3B-Instruct-GGUF",
    target: "laptop",
    label: "Qwen2.5 3B Instruct",
    sizeLabel: "≈2.0 GB",
    description: "Best balance for most laptops (8 GB RAM+). Good reasoning and structured answers.",
    recommended: true,
    contextSize: 8192,
    license: "Qwen Research",
  },
  {
    id: "llama3.2-3b",
    file: "Llama-3.2-3B-Instruct-Q4_K_M.gguf",
    repo: "bartowski/Llama-3.2-3B-Instruct-GGUF",
    target: "laptop",
    label: "Llama 3.2 3B Instruct",
    sizeLabel: "≈2.0 GB",
    description: "Alternative 3B model with a different writing style.",
    contextSize: 8192,
    license: "Llama 3.2 Community",
  },
  {
    id: "qwen2.5-7b",
    file: "Qwen2.5-7B-Instruct-Q4_K_M.gguf",
    repo: "bartowski/Qwen2.5-7B-Instruct-GGUF",
    target: "laptop",
    label: "Qwen2.5 7B Instruct",
    sizeLabel: "≈4.7 GB",
    description: "Noticeably smarter, needs 16 GB RAM and is slower without a GPU.",
    contextSize: 8192,
    license: "Apache-2.0",
  },
  {
    id: "qwen2.5-1.5b",
    file: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
    target: "phone",
    label: "Qwen2.5 1.5B Instruct",
    sizeLabel: "≈1.1 GB",
    description: "Recommended for phones. Small enough for most modern Android phones, still gives useful critiques.",
    recommended: true,
    contextSize: 4096,
    license: "Apache-2.0",
  },
  {
    id: "qwen2.5-0.5b",
    file: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
    repo: "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
    target: "phone",
    label: "Qwen2.5 0.5B Instruct (lite)",
    sizeLabel: "≈0.4 GB",
    description: "For older or low-memory phones. Fast, but answers are simpler.",
    contextSize: 4096,
    license: "Apache-2.0",
  },
];

export const modelByFile = (file: string | null | undefined) => MODEL_CATALOG.find((m) => m.file === file);
export const modelUrl = (m: ModelInfo) => `https://huggingface.co/${m.repo}/resolve/main/${m.file}`;

/** Only plain GGUF file names are accepted anywhere a model file is referenced. */
export function isSafeModelFile(name: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}\.gguf$/.test(name) && !name.includes("..");
}

export function formatBytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`;
  return `${Math.round(n / 1e3)} KB`;
}

/**
 * Small models have small context windows. Keep the conversation within a
 * character budget: always keep the system prompt and the latest message,
 * shorten the first (context-heavy) user message, and drop the oldest
 * middle turns if still too long.
 */
export function fitMessages<T extends { role: string; content: string }>(messages: T[], maxChars: number): T[] {
  const total = (ms: T[]) => ms.reduce((n, m) => n + m.content.length, 0);
  let out = messages.map((m) => ({ ...m }));
  if (total(out) <= maxChars) return out;
  // Drop older middle turns (keep system, first user, and the last 3 messages)
  const firstUser = out.findIndex((m) => m.role === "user");
  while (total(out) > maxChars && out.length > firstUser + 4) out.splice(firstUser + 1, 1);
  // Shorten the first user message (the idea context) if needed
  const over = total(out) - maxChars;
  if (over > 0 && firstUser >= 0) {
    const m = out[firstUser];
    const marker = "\n\n[…shortened to fit the offline model's memory]";
    const keep = Math.max(800, m.content.length - over - marker.length);
    out[firstUser] = { ...m, content: m.content.slice(0, keep) + marker };
  }
  // Last resort: trim the system prompt
  if (total(out) > maxChars && out[0]?.role === "system") {
    out[0] = { ...out[0], content: out[0].content.slice(0, Math.max(400, out[0].content.length - (total(out) - maxChars))) };
  }
  return out;
}

/** Rough characters-per-token for budgeting (English text ≈ 3.5–4). */
export const CHARS_PER_TOKEN = 3.2;
