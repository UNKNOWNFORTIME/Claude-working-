import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getIdeaDetail } from "@/server/services/ideas";
import { listCategories } from "@/server/services/taxonomy";
import { getRelated } from "@/server/services/links";
import { listConversations } from "@/server/services/ai";
import { getAISettingsView } from "@/server/services/settings";
import { assertUuid, orNotFound } from "@/server/page-helpers";
import { db } from "@/lib/db";
import { IdeaWorkspace } from "./idea-workspace";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = await db.idea.findFirst({ where: { id: /^[0-9a-f-]{36}$/i.test(id) ? id : undefined }, select: { title: true } }).catch(() => null);
  return { title: idea?.title ?? "Idea" };
}

export default async function IdeaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; c?: string; run?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { tab, c, run } = await searchParams;
  assertUuid(id);
  const idea = await orNotFound(() => getIdeaDetail(user.id, id));
  const [categories, related, conversations, ai, tags, otherIdeas] = await Promise.all([
    listCategories(user.id),
    getRelated(user.id, "IDEA", id),
    listConversations(user.id, id),
    getAISettingsView(user.id),
    db.tag.findMany({ where: { userId: user.id }, select: { name: true } }),
    db.idea.findMany({ where: { userId: user.id, deletedAt: null, id: { not: id } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);

  return (
    <div>
      <Link href="/ideas" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Ideas
      </Link>
      <IdeaWorkspace
        idea={idea}
        categories={categories.map((x) => ({ id: x.id, name: x.name, color: x.color }))}
        related={related}
        conversations={conversations}
        ai={{ ready: ai.ready, provider: ai.aiProvider, label: ai.aiProvider === "local" ? `Offline model on your computer${ai.localModel ? ` · ${ai.localModel}` : ""}` : `Online API · ${ai.effectiveModel}` }}
        tagSuggestions={tags.map((t) => t.name)}
        otherIdeas={otherIdeas}
        initialTab={tab}
        openConversation={c}
        autoRun={run === "critique" ? "critique" : undefined}
      />
    </div>
  );
}
