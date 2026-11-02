import Link from "next/link";
import { ClipboardCheck, Compass, FolderKanban, Inbox, Lightbulb, NotebookPen, Search, Target } from "lucide-react";
import { requireUser } from "@/server/auth";
import { globalSearch, type SearchKind } from "@/server/services/search";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { SearchInput } from "@/components/shared/filter-bar";
import { TimeAgo } from "@/components/shared/item-link";
import { cn } from "@/lib/utils";

export const metadata = { title: "Search" };

const KINDS: { value: SearchKind; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "idea", label: "Ideas", icon: Lightbulb },
  { value: "thought", label: "Thoughts", icon: Inbox },
  { value: "project", label: "Projects", icon: FolderKanban },
  { value: "goal", label: "Goals", icon: Target },
  { value: "evaluation", label: "Evaluations", icon: ClipboardCheck },
  { value: "note", label: "Notes", icon: NotebookPen },
  { value: "reflection", label: "Reflections", icon: Compass },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string; sort?: string }> }) {
  const user = await requireUser();
  const { q = "", kind, sort } = await searchParams;
  const kinds = KINDS.some((k) => k.value === kind) ? [kind as SearchKind] : undefined;
  let hits = q.trim() ? await globalSearch(user.id, q, { kinds, take: 50 }) : [];
  if (sort === "oldest") hits = hits.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  else if (sort === "recent") hits = hits.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const params = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ q, ...(kind ? { kind } : {}), ...(sort ? { sort } : {}) });
    for (const [k, v] of Object.entries(patch)) v ? p.set(k, v) : p.delete(k);
    return `/search?${p}`;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Search" description="Across thoughts, ideas, projects, goals, evaluations, notes and reflections." />
      <SearchInput placeholder="Search everything" className="mb-4" />
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <Link href={params({ kind: undefined })} className={cn("rounded-full border px-3 py-1 text-xs", !kind ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>Everything</Link>
        {KINDS.map((k) => (
          <Link key={k.value} href={params({ kind: k.value })} className={cn("rounded-full border px-3 py-1 text-xs", kind === k.value ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>{k.label}</Link>
        ))}
        <span className="ml-auto flex gap-2 text-xs text-muted-foreground">
          <Link href={params({ sort: undefined })} className={cn(!sort && "text-foreground")}>Relevance</Link>
          <Link href={params({ sort: "recent" })} className={cn(sort === "recent" && "text-foreground")}>Recent</Link>
          <Link href={params({ sort: "oldest" })} className={cn(sort === "oldest" && "text-foreground")}>Oldest</Link>
        </span>
      </div>
      {!q.trim() ? (
        <EmptyState icon={Search} title="Search your mind">Tip: press ⌘K anywhere to search instantly.</EmptyState>
      ) : hits.length === 0 ? (
        <EmptyState icon={Search} title="No results">Nothing matched “{q}”.</EmptyState>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {hits.map((h) => {
            const Icon = KINDS.find((k) => k.value === h.kind)!.icon;
            return (
              <li key={`${h.kind}${h.id}`}>
                <Link href={h.href} className="flex gap-3 px-4 py-3 hover:bg-muted/50">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{h.title}</div>
                    {h.snippet && <div className="line-clamp-2 text-xs text-muted-foreground">{h.snippet}</div>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground"><TimeAgo date={h.updatedAt} /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
