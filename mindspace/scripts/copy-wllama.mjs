// Copies the wllama WebAssembly binary into /public so on-device AI works
// without any CDN (fully offline). Runs automatically after npm install.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules/@wllama/wllama/esm/wasm/wllama.wasm");
const dest = path.join(root, "public/wllama/wllama.wasm");
if (!fs.existsSync(src)) {
  console.warn("[mindspace] @wllama/wllama not installed — on-device AI will be unavailable.");
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("[mindspace] copied wllama.wasm → public/wllama/");
