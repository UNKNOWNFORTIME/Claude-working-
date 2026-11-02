import fs from "node:fs";
import path from "node:path";

/** Loads .env for standalone scripts (Next.js does this itself at runtime). */
const file = path.resolve(__dirname, "../.env");
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
