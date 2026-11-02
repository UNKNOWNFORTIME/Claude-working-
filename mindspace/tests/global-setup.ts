import { execSync } from "node:child_process";
import { loadEnv } from "./env";

export default function setup() {
  loadEnv();
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
