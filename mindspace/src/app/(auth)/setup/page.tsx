import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Set up" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/login");
  return <SetupForm />;
}
