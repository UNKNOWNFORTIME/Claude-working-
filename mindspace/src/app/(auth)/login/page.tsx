import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if ((await db.user.count()) === 0) redirect("/setup");
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/"} />;
}
