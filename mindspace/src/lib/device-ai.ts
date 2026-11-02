"use client";
/**
 * On-device AI: runs a small GGUF model inside the browser with llama.cpp
 * compiled to WebAssembly (wllama). Uses WebGPU when the phone supports it,
 * otherwise the CPU. The model is downloaded once from this Mindspace server
 * (not from the internet) and kept in the browser's storage.
 */
import type { Wllama } from "@wllama/wllama/esm/index.js";
import { CHARS_PER_TOKEN, fitMessages } from "@/lib/ai-models";

export type DeviceMessage = { role: "system" | "user" | "assistant"; content: string };

const PREF_KEY = "mindspace.deviceAI";
export interface DevicePrefs {
  enabled: boolean;
  file: string | null;
}

export function getDevicePrefs(): DevicePrefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return { enabled: false, file: null, ...JSON.parse(raw) };
  } catch {}
  return { enabled: false, file: null };
}

export function setDevicePrefs(p: DevicePrefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {}
  window.dispatchEvent(new Event("mindspace-device-ai"));
}

export function deviceCapabilities() {
  const nav = navigator as Navigator & { gpu?: unknown; deviceMemory?: number };
  return {
    webgpu: !!nav.gpu,
    multithread: typeof crossOriginIsolated !== "undefined" && crossOriginIsolated,
    secure: typeof isSecureContext !== "undefined" && isSecureContext,
    cores: navigator.hardwareConcurrency || 0,
    memoryGB: nav.deviceMemory ?? null,
  };
}

const CTX = 4096;
const MAX_TOKENS = 600;

let instance: Wllama | null = null;
let loadedFile: string | null = null;
let loading: Promise<void> | null = null;

const modelUrl = (file: string) => new URL(`/api/models/${encodeURIComponent(file)}`, window.location.origin).href;

async function newInstance() {
  const { Wllama } = await import("@wllama/wllama/esm/index.js");
  return new Wllama({ default: "/wllama/wllama.wasm" }, { suppressNativeLog: true, allowOffline: true });
}

/** Loads (and on first use downloads + caches) the model. */
export async function loadDeviceModel(file: string, onProgress?: (fraction: number) => void) {
  if (instance && loadedFile === file) return;
  if (loading) await loading.catch(() => undefined);
  if (instance && loadedFile === file) return;
  loading = (async () => {
    if (instance) await instance.exit().catch(() => undefined);
    instance = null;
    loadedFile = null;
    const w = await newInstance();
    const params = {
      n_ctx: CTX,
      progressCallback: ({ loaded, total }: { loaded: number; total: number }) => total && onProgress?.(loaded / total),
    };
    try {
      await w.loadModelFromUrl(modelUrl(file), { ...params, useCache: true });
    } catch (e) {
      // Browser storage is unavailable on plain-http LAN addresses: load without caching.
      if (deviceCapabilities().secure) throw e;
      await w.loadModelFromUrl(modelUrl(file), { ...params, useCache: false });
    }
    instance = w;
    loadedFile = file;
  })();
  try {
    await loading;
  } finally {
    loading = null;
  }
}

export function deviceModelLoaded() {
  return loadedFile;
}

/** Is the model already stored on this device? */
export async function isModelCached(file: string) {
  try {
    const { CacheManager } = await import("@wllama/wllama/esm/index.js");
    const cm = new CacheManager();
    const name = await cm.getNameFromURL(modelUrl(file));
    return (await cm.getSize(name)) > 0;
  } catch {
    return false;
  }
}

export async function removeDeviceModel(file: string) {
  if (loadedFile === file && instance) {
    await instance.exit().catch(() => undefined);
    instance = null;
    loadedFile = null;
  }
  const { CacheManager } = await import("@wllama/wllama/esm/index.js");
  const cm = new CacheManager();
  await cm.delete(await cm.getNameFromURL(modelUrl(file)));
}

/** Generates a reply on this device, streaming tokens to `onToken`. */
export async function deviceChat(file: string, messages: DeviceMessage[], opts: { onToken?: (textSoFar: string) => void; signal?: AbortSignal; onLoadProgress?: (f: number) => void } = {}) {
  await loadDeviceModel(file, opts.onLoadProgress);
  const w = instance!;
  const fitted = fitMessages(messages, Math.floor((CTX - MAX_TOKENS - 64) * CHARS_PER_TOKEN));
  let text = "";
  await w.createChatCompletion({
    messages: fitted,
    stream: true,
    max_tokens: MAX_TOKENS,
    temperature: 0.5,
    top_p: 0.9,
    abortSignal: opts.signal,
    onData: (chunk) => {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
        opts.onToken?.(text);
      }
    },
  });
  return text.trim();
}
