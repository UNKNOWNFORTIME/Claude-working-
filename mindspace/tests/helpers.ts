import { db } from "@/lib/db";

export async function resetDb() {
  // Cascades from User remove everything
  await db.$executeRawUnsafe(`TRUNCATE "User" CASCADE`);
}

export async function makeUser(email: string) {
  return db.user.create({ data: { email, passwordHash: "x" } });
}
