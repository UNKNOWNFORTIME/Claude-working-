import { requireUser } from "@/server/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [inboxCount, tags] = await Promise.all([
    db.thought.count({ where: { userId: user.id, status: "INBOX", deletedAt: null } }),
    db.tag.findMany({ where: { userId: user.id }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <AppShell user={user} inboxCount={inboxCount} tagSuggestions={tags.map((t) => t.name)}>
      {children}
    </AppShell>
  );
}
