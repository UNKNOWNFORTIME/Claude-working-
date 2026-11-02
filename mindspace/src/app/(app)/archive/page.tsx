import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listTrash } from "@/server/services/trash";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TimeAgo } from "@/components/shared/item-link";
import { outcomeLabel } from "@/lib/constants";
import { Archive, Trash2 } from "lucide-react";
import { TrashList } from "./trash-list";
import { firstLine } from "@/lib/utils";

export const metadata = { title: "Archive" };

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const base = { userId: user.id, deletedAt: null };
  const [ideas, thoughts, projects, goals, trash] = await Promise.all([
    db.idea.findMany({ where: { ...base, stage: "ARCHIVED" }, orderBy: { updatedAt: "desc" }, include: { decisions: { orderBy: { decidedAt: "desc" }, take: 1 } } }),
    db.thought.findMany({ where: { ...base, status: "ARCHIVED" }, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.project.findMany({ where: { ...base, status: { in: ["CANCELLED", "COMPLETED"] } }, orderBy: { updatedAt: "desc" } }),
    db.goal.findMany({ where: { ...base, status: { in: ["DROPPED", "ACHIEVED"] } }, orderBy: { updatedAt: "desc" } }),
    listTrash(user.id),
  ]);
  const archivedCount = ideas.length + thoughts.length + projects.length + goals.length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Archive" description="Nothing is lost. Archived items are out of the way; trashed items can be restored." />
      <Tabs defaultValue={tab === "trash" ? "trash" : "archived"}>
        <TabsList>
          <TabsTrigger value="archived"><Archive /> Archived {archivedCount > 0 && <span className="text-muted-foreground">{archivedCount}</span>}</TabsTrigger>
          <TabsTrigger value="trash"><Trash2 /> Trash {trash.length > 0 && <span className="text-muted-foreground">{trash.length}</span>}</TabsTrigger>
        </TabsList>
        <TabsContent value="archived" className="space-y-8 pt-6">
          {archivedCount === 0 && <EmptyState icon={Archive} title="Nothing archived">Ideas you decide aren&apos;t worth pursuing, finished projects and archived thoughts end up here.</EmptyState>}
          {ideas.length > 0 && (
            <Group title="Ideas">
              {ideas.map((i) => (
                <Row key={i.id} href={`/ideas/${i.id}`} title={i.title} meta={i.decisions[0] ? `${outcomeLabel(i.decisions[0].outcome)}${i.decisions[0].rationale ? ` — ${i.decisions[0].rationale}` : ""}` : undefined} date={i.updatedAt} />
              ))}
            </Group>
          )}
          {projects.length > 0 && (
            <Group title="Projects">
              {projects.map((p) => <Row key={p.id} href={`/projects/${p.id}`} title={p.name} badge={p.status === "COMPLETED" ? "Completed" : "Cancelled"} date={p.updatedAt} />)}
            </Group>
          )}
          {goals.length > 0 && (
            <Group title="Goals">
              {goals.map((g) => <Row key={g.id} href={`/goals/${g.id}`} title={g.title} badge={g.status === "ACHIEVED" ? "Achieved" : "Dropped"} date={g.updatedAt} />)}
            </Group>
          )}
          {thoughts.length > 0 && (
            <Group title="Thoughts">
              {thoughts.map((t) => <Row key={t.id} href={`/inbox?status=ARCHIVED&thought=${t.id}`} title={firstLine(t.content, 120)} date={t.createdAt} />)}
            </Group>
          )}
        </TabsContent>
        <TabsContent value="trash" className="pt-6">
          <TrashList items={trash} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-serif text-lg">{title}</h2>
      <ul className="divide-y rounded-xl border bg-card">{children}</ul>
    </section>
  );
}
function Row({ href, title, meta, badge, date }: { href: string; title: string; meta?: string; badge?: string; date: Date }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{title}</div>
          {meta && <div className="truncate text-xs text-muted-foreground">{meta}</div>}
        </div>
        {badge && <Badge>{badge}</Badge>}
        <span className="shrink-0 text-xs text-muted-foreground"><TimeAgo date={date} /></span>
      </Link>
    </li>
  );
}
