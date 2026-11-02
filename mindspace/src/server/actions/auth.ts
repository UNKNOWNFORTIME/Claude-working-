"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/validation";
import { endSession, requireUserId, startSession } from "@/server/auth";
import { run } from "./_run";
import { headers } from "next/headers";

// Basic brute-force protection: per-IP attempt window kept in memory.
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW = 15 * 60_000;
const MAX_ATTEMPTS = 8;

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

let dummyHash: string | undefined;

export type FormState = { error?: string; email?: string; name?: string } | undefined;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const key = await clientKey();
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec && now - rec.first < WINDOW && rec.count >= MAX_ATTEMPTS) {
    return { error: "Too many attempts. Please wait a few minutes and try again.", email: String(form.get("email") ?? "") };
  }
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  // Always run bcrypt to keep timing similar whether or not the user exists
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !ok) {
    const r = rec && now - rec.first < WINDOW ? rec : { count: 0, first: now };
    attempts.set(key, { ...r, count: r.count + 1 });
    return { error: "Incorrect email or password.", email };
  }
  attempts.delete(key);
  await startSession(user);
  const next = String(form.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

const setupSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: passwordSchema,
});

/** First-run account creation. Only works while no account exists. */
export async function setupAccount(_: FormState, form: FormData): Promise<FormState> {
  if ((await db.user.count()) > 0) return { error: "An account already exists. Please sign in." };
  const parsed = setupSchema.safeParse({ name: form.get("name") || undefined, email: form.get("email"), password: form.get("password") });
  const keep = { email: String(form.get("email") ?? ""), name: String(form.get("name") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, ...keep };
  if (form.get("password") !== form.get("confirm")) return { error: "Passwords don't match.", ...keep };
  const user = await db.user.create({
    data: { email: parsed.data.email, name: parsed.data.name || null, passwordHash: await bcrypt.hash(parsed.data.password, 12), settings: { create: {} } },
  });
  await startSession(user);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function changePassword(input: { current: string; next: string }) {
  return run(async (uid) => {
    const user = await db.user.findUniqueOrThrow({ where: { id: uid } });
    if (!(await bcrypt.compare(input.current, user.passwordHash))) throw new Error("Current password is incorrect");
    const next = passwordSchema.parse(input.next);
    const updated = await db.user.update({
      where: { id: uid },
      data: { passwordHash: await bcrypt.hash(next, 12), sessionVersion: { increment: 1 } },
    });
    await startSession(updated); // keep this session, invalidate all others
    return null;
  });
}

export async function updateProfile(input: { name: string }) {
  return run(async (uid) => {
    await db.user.update({ where: { id: uid }, data: { name: input.name.trim().slice(0, 100) || null } });
    return null;
  }, ["/settings", "/"]);
}

export async function signOutEverywhere() {
  const uid = await requireUserId();
  await db.user.update({ where: { id: uid }, data: { sessionVersion: { increment: 1 } } });
  await endSession();
  redirect("/login");
}
