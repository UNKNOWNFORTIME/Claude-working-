/**
 * Built-in offline AI: runs a GGUF model inside the Mindspace server process
 * with llama.cpp (node-llama-cpp). No internet and no separate app needed —
 * the model file just has to be in MODELS_DIR (see `npm run ai:download`).
 */
import fs from "node:fs";
import path from "node:path";
import { CHARS_PER_TOKEN, fitMessages, isSafeModelFile, modelByFile, MODEL_CATALOG } from "@/lib/ai-models";
import { ValidationError } from "./errors";
import type { ChatMessage } from "./ai";

export function modelsDir() {
  return path.resolve(process.env.MODELS_DIR || "./models");
}

export interface LocalModelFile {
  file: string;
  sizeBytes: number;
  target: "laptop" | "phone" | "unknown";
  label: string;
}

/** GGUF files present in the models folder (downloads in progress are ignored). */
export function listLocalModels(): LocalModelFile[] {
  const dir = modelsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => isSafeModelFile(f))
    .map((file): LocalModelFile => {
      const info = modelByFile(file);
      return { file, sizeBytes: fs.statSync(path.join(dir, file)).size, target: info?.target ?? "unknown", label: info?.label ?? file };
    })
    .sort((a, b) => a.sizeBytes - b.sizeBytes);
}

export function resolveModelPath(file: string) {
  if (!isSafeModelFile(file)) throw new ValidationError("Invalid model file name");
  const full = path.join(modelsDir(), file);
  if (!full.startsWith(modelsDir() + path.sep) || !fs.existsSync(full)) throw new ValidationError(`Model “${file}” isn't downloaded. Run: npm run ai:download`);
  return full;
}

/** Pick the configured model, else the recommended laptop model, else the largest available. */
export function pickLaptopModel(preferred?: string | null) {
  const files = listLocalModels();
  if (preferred && files.some((f) => f.file === preferred)) return preferred;
  const rec = MODEL_CATALOG.find((m) => m.target === "laptop" && m.recommended && files.some((f) => f.file === m.file));
  if (rec) return rec.file;
  const laptop = files.filter((f) => f.target !== "phone");
  return (laptop.length ? laptop : files).at(-1)?.file ?? null;
}

// ---- Engine (lazy, singleton, one generation at a time) ----

type Llama = Awaited<ReturnType<typeof import("node-llama-cpp")["getLlama"]>>;
type LlamaModel = Awaited<ReturnType<Llama["loadModel"]>>;

const g = globalThis as unknown as { __mindspaceLlama?: { llama?: Llama; model?: LlamaModel; file?: string; queue: Promise<unknown> } };
const state = (g.__mindspaceLlama ??= { queue: Promise.resolve() });

async function loadModel(file: string) {
  if (state.model && state.file === file) return state.model;
  const { getLlama } = await import("node-llama-cpp");
  state.llama ??= await getLlama();
  if (state.model) await state.model.dispose();
  state.model = undefined;
  state.model = await state.llama.loadModel({ modelPath: resolveModelPath(file) });
  state.file = file;
  return state.model;
}

/** Serialise generations — a laptop CPU should run one at a time. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = state.queue.then(fn, fn);
  state.queue = run.catch(() => undefined);
  return run;
}

export async function localChat(file: string, messages: ChatMessage[], opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const maxTokens = opts.maxTokens ?? 900;
  return enqueue(async () => {
    let model: LlamaModel;
    try {
      model = await loadModel(file);
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ValidationError(`Couldn't load the offline model: ${(e as Error).message}`);
    }
    const { LlamaChatSession } = await import("node-llama-cpp");
    const contextSize = Math.min(modelByFile(file)?.contextSize ?? 8192, model.trainContextSize || 8192);
    const fitted = fitMessages(messages, Math.floor((contextSize - maxTokens - 64) * CHARS_PER_TOKEN));
    const context = await model.createContext({ contextSize });
    try {
      const system = fitted.find((m) => m.role === "system")?.content;
      const turns = fitted.filter((m) => m.role !== "system");
      const last = turns.pop();
      if (!last || last.role !== "user") throw new ValidationError("Nothing to answer");
      const session = new LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt: system });
      session.setChatHistory([
        ...(system ? [{ type: "system" as const, text: system }] : []),
        ...turns.map((m) => (m.role === "user" ? { type: "user" as const, text: m.content } : { type: "model" as const, response: [m.content] })),
      ]);
      const reply = await session.prompt(last.content, { maxTokens, temperature: opts.temperature ?? 0.5 });
      return reply.trim();
    } finally {
      await context.dispose();
    }
  });
}
