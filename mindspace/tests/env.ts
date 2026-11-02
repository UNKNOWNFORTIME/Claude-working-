import fs from "node:fs";
import path from "node:path";

/** Minimal .env loader so tests don't need an extra dependency. */
export function loadEnv() {
  if (process.env.MINDSPACE_TEST_ENV === "1") return;
  const file = path.resolve(__dirname, "../.env");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL must be set to run tests (see .env.example)");
  if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL — tests wipe the database");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.MINDSPACE_TEST_ENV = "1";
  process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-123";
}
