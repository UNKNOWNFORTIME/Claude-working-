import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import { fitMessages, isSafeModelFile } from "@/lib/ai-models";

const TEST_GGUF = process.env.TEST_GGUF; // optional: path to a small GGUF to exercise real inference

describe("model file safety", () => {
  it("accepts plain GGUF names only", () => {
    expect(isSafeModelFile("qwen2.5-1.5b-instruct-q4_k_m.gguf")).toBe(true);
    for (const bad of ["../etc/passwd", "..%2f.gguf", "a/b.gguf", "model.bin", ".hidden.gguf", "x..gguf", "a b.gguf"]) {
      expect(isSafeModelFile(bad), bad).toBe(false);
    }
  });
});

describe("fitMessages (small context windows)", () => {
  const big = (n: number) => "x".repeat(n);
  it("leaves short conversations alone", () => {
    const ms = [{ role: "system", content: "sys" }, { role: "user", content: "hi" }];
    expect(fitMessages(ms, 1000)).toEqual(ms);
  });
  it("keeps system + latest message and shortens the idea context", () => {
    const ms = [
      { role: "system", content: big(300) },
      { role: "user", content: big(20_000) },
      { role: "assistant", content: big(500) },
      { role: "user", content: "follow-up?" },
    ];
    const out = fitMessages(ms, 5000);
    expect(out.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(5000);
    expect(out[0].role).toBe("system");
    expect(out.at(-1)!.content).toBe("follow-up?");
    expect(out[1].content).toContain("shortened");
  });
  it("drops old middle turns in long conversations", () => {
    const ms = [{ role: "system", content: "s" }, { role: "user", content: big(1000) }];
    for (let i = 0; i < 20; i++) ms.push({ role: i % 2 ? "user" : "assistant", content: big(1000) });
    ms.push({ role: "user", content: "latest" });
    const out = fitMessages(ms, 6000);
    expect(out.length).toBeLessThan(ms.length);
    expect(out.at(-1)!.content).toBe("latest");
  });
});

describe("local model files", () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-models-"));
    fs.writeFileSync(path.join(dir, "qwen2.5-1.5b-instruct-q4_k_m.gguf"), "GGUF");
    fs.writeFileSync(path.join(dir, "notes.txt"), "x");
    fs.writeFileSync(path.join(dir, "big.gguf.part"), "x");
    process.env.MODELS_DIR = dir;
  });

  it("lists only finished GGUF files and tags known phone models", async () => {
    const { listLocalModels } = await import("@/server/services/local-ai");
    const list = listLocalModels();
    expect(list.map((m) => m.file)).toEqual(["qwen2.5-1.5b-instruct-q4_k_m.gguf"]);
    expect(list[0].target).toBe("phone");
  });

  it("refuses path traversal and missing files", async () => {
    const { resolveModelPath } = await import("@/server/services/local-ai");
    expect(() => resolveModelPath("../secret.gguf")).toThrow();
    expect(() => resolveModelPath("missing.gguf")).toThrow(/isn't downloaded/);
    expect(resolveModelPath("qwen2.5-1.5b-instruct-q4_k_m.gguf")).toBe(path.join(dir, "qwen2.5-1.5b-instruct-q4_k_m.gguf"));
  });

  it("falls back to an available model when the preferred one is missing", async () => {
    const { pickLaptopModel } = await import("@/server/services/local-ai");
    expect(pickLaptopModel("gone.gguf")).toBe("qwen2.5-1.5b-instruct-q4_k_m.gguf");
  });
});

describe.skipIf(!TEST_GGUF)("built-in offline model (real inference)", () => {
  it("answers through the same chatCompletion path the app uses", async () => {
    process.env.MODELS_DIR = path.dirname(TEST_GGUF!);
    const { chatCompletion } = await import("@/server/services/ai");
    const reply = await chatCompletion(
      { enabled: true, provider: "local", localModel: path.basename(TEST_GGUF!), baseUrl: "", model: "", apiKey: null },
      [{ role: "system", content: "Be brief." }, { role: "user", content: "Name one risk of a new side project." + "context ".repeat(6000) }],
    );
    expect(reply.length).toBeGreaterThan(5);
  }, 180_000);
});
