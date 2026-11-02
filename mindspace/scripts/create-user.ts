/**
 * Create (or reset the password of) the single Mindspace account from the CLI.
 *   npm run user:create -- you@example.com "a long password" "Your Name"
 */
import "./load-env";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run user:create -- <email> "<password>" ["Name"]');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }
  const db = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), passwordHash, name: name ?? null, settings: { create: {} } },
    update: { passwordHash, sessionVersion: { increment: 1 }, ...(name ? { name } : {}) },
  });
  console.log(`✓ Account ready: ${user.email}`);
  await db.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
