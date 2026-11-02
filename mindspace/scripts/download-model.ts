/**
 * Downloads offline AI models into MODELS_DIR (default ./models).
 *
 *   npm run ai:download                 # recommended laptop + phone models
 *   npm run ai:download -- laptop       # just the recommended laptop model
 *   npm run ai:download -- phone        # just the recommended phone model
 *   npm run ai:download -- qwen2.5-7b   # a specific model id
 *   npm run ai:models                   # list available models
 *
 * Downloads resume if interrupted. After downloading, Mindspace never needs
 * the internet for AI.
 */
import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { MODEL_CATALOG, formatBytes, modelUrl, type ModelInfo } from "../src/lib/ai-models";

const dir = path.resolve(process.env.MODELS_DIR || "./models");

function list() {
  console.log("\nAvailable offline models:\n");
  for (const m of MODEL_CATALOG) {
    const have = fs.existsSync(path.join(dir, m.file)) ? "✓ downloaded" : "";
    console.log(`  ${m.id.padEnd(14)} ${m.target.padEnd(7)} ${m.sizeLabel.padEnd(8)} ${m.label}${m.recommended ? " (recommended)" : ""}  ${have}`);
  }
  console.log(`\nModels folder: ${dir}\n`);
}

async function download(m: ModelInfo) {
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, m.file);
  if (fs.existsSync(dest)) return console.log(`✓ ${m.label} already downloaded`);
  const part = `${dest}.part`;
  const have = fs.existsSync(part) ? fs.statSync(part).size : 0;
  const url = modelUrl(m);
  console.log(`↓ ${m.label} (${m.sizeLabel})\n  ${url}`);
  const res = await fetch(url, { headers: have ? { Range: `bytes=${have}-` } : {}, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
  const resumed = res.status === 206;
  const total = Number(res.headers.get("content-length") ?? 0) + (resumed ? have : 0);
  const out = fs.createWriteStream(part, { flags: resumed ? "a" : "w" });
  let done = resumed ? have : 0;
  let last = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    if (!out.write(value)) await new Promise((r) => out.once("drain", r));
    done += value.length;
    if (Date.now() - last > 500) {
      last = Date.now();
      process.stdout.write(`\r  ${total ? Math.floor((done / total) * 100) : "?"}%  ${formatBytes(done)}${total ? ` / ${formatBytes(total)}` : ""}   `);
    }
  }
  await new Promise<void>((r, j) => out.end((e?: Error | null) => (e ? j(e) : r())));
  const head = Buffer.alloc(4);
  const fd = fs.openSync(part, "r");
  fs.readSync(fd, head, 0, 4, 0);
  fs.closeSync(fd);
  if (head.toString() !== "GGUF") throw new Error("Downloaded file is not a GGUF model");
  fs.renameSync(part, dest);
  console.log(`\r✓ ${m.label} saved to ${dest}                    `);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) return list();
  const want = args.length ? args : ["laptop", "phone"];
  const picks = new Map<string, ModelInfo>();
  for (const a of want) {
    const found = a === "laptop" || a === "phone" ? MODEL_CATALOG.filter((m) => m.target === a && m.recommended) : MODEL_CATALOG.filter((m) => m.id === a || m.file === a);
    if (!found.length) {
      console.error(`Unknown model "${a}".`);
      list();
      process.exit(1);
    }
    found.forEach((m) => picks.set(m.id, m));
  }
  for (const m of picks.values()) await download(m);
  console.log("\nDone. Open Settings → AI thinking partner in Mindspace.");
}

main().catch((e) => {
  console.error(`\n✗ ${(e as Error).message}\n  Re-run the same command to resume.`);
  process.exit(1);
});
