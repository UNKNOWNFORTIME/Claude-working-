"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanban, Inbox, Lightbulb, Link2, Loader2, Plus, Target, X } from "lucide-react";
import { linkItems, searchLinkCandidates, unlinkItems } from "@/server/actions/misc";
import type { RelatedItem } from "@/server/services/links";
import { ENTITY_LABELS, entityHref } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import type { EntityType } from "@prisma/client";

const ICON: Record<EntityType, React.ComponentType<{ className?: string }>> = { IDEA: Lightbulb, PROJECT: FolderKanban, GOAL: Target, THOUGHT: Inbox };

export function RelatedItems({ type, id, items, path, compact }: { type: EntityType; id: string; items: RelatedItem[]; path: string; compact?: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();

  return (
    <div className="space-y-3">
      {items.length === 0 && !compact ? (
        <EmptyState icon={Link2} title="No connections yet" action={<LinkPicker type={type} id={id} path={path} existing={items} />}>
          Link related ideas, projects and goals. Seeing what connects is often where the best thinking comes from.
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-1">
            {items.map((r) => {
              const Icon = ICON[r.type];
              return (
                <li key={r.linkId} className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/60">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={entityHref(r.type, r.id)} className="min-w-0 flex-1 truncate text-sm hover:text-primary">{r.title}</Link>
                  {r.note && <span className="hidden truncate text-xs text-muted-foreground sm:block">{r.note}</span>}
                  <span className="shrink-0 text-[11px] text-muted-foreground">{ENTITY_LABELS[r.type]}</span>
                  <button
                    onClick={() => start(async () => { const res = await unlinkItems(r.linkId, path); if (!res.ok) toast.error(res.error); router.refresh(); })}
                    className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Unlink ${r.title}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <LinkPicker type={type} id={id} path={path} existing={items} />
        </>
      )}
    </div>
  );
}

function LinkPicker({ type, id, path, existing }: { type: EntityType; id: string; path: string; existing: RelatedItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState<{ type: EntityType; id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchLinkCandidates(q.trim());
      setLoading(false);
      if (res.ok) setResults(res.data.filter((r) => !(r.type === type && r.id === id) && !existing.some((e) => e.type === r.type && e.id === r.id)));
    }, 150);
    return () => clearTimeout(t);
  }, [q, open, type, id, existing]);

  const link = (target: { type: EntityType; id: string }) =>
    start(async () => {
      const res = await linkItems({ fromType: type, fromId: id, toType: target.type, toId: target.id, note: note.trim() || undefined }, path);
      if (!res.ok) return void toast.error(res.error);
      setOpen(false);
      setQ("");
      setNote("");
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus /> Link item</Button>
      <DialogContent title="Link a related item" description="Connections are two-way: they show up on both items.">
        <div className="space-y-3">
          <Input autoFocus placeholder="Search ideas, projects, goals…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items to link" />
          <Input placeholder="How are they related? (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Relationship note" maxLength={300} />
          <div className="max-h-72 overflow-y-auto rounded-md border">
            {loading ? (
              <div className="flex items-center justify-center p-6 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
            ) : results.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Nothing to link{q ? ` matching “${q}”` : ""}.</p>
            ) : (
              <ul className="divide-y">
                {results.map((r) => {
                  const Icon = ICON[r.type];
                  return (
                    <li key={`${r.type}${r.id}`}>
                      <button disabled={pending} onClick={() => link(r)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{r.title}</span>
                        <span className="text-[11px] text-muted-foreground">{ENTITY_LABELS[r.type]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
