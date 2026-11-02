"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as D from "@radix-ui/react-dialog";
import { ClipboardCheck, FileText, FolderKanban, Inbox, Lightbulb, Loader2, NotebookPen, Plus, Search, Target, Compass } from "lucide-react";
import { quickSearch } from "@/server/actions/misc";
import type { SearchHit } from "@/server/services/search";
import { NAV_ITEMS } from "./nav-items";

const KIND_ICON = { idea: Lightbulb, thought: Inbox, project: FolderKanban, goal: Target, evaluation: ClipboardCheck, note: NotebookPen, reflection: Compass } as const;

export function CommandPalette({ open, onOpenChange, onCapture }: { open: boolean; onOpenChange: (v: boolean) => void; onCapture: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await quickSearch(term);
      setLoading(false);
      if (res.ok) setHits(res.data);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
        <D.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-2xl shadow-black/15 data-[state=open]:animate-[dialog-in_140ms_ease-out]">
          <D.Title className="sr-only">Search</D.Title>
          <D.Description className="sr-only">Search everything or jump to a page</D.Description>
          <Command shouldFilter={false} loop>
            <div className="flex items-center gap-2 border-b px-4">
              <Search className="size-4 text-muted-foreground" />
              <Command.Input value={q} onValueChange={setQ} placeholder="Search thoughts, ideas, projects, goals, evaluations…" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
              {q.trim().length >= 2 && !loading && hits.length === 0 && <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing found for “{q}”.</Command.Empty>}
              {hits.length > 0 && (
                <Command.Group heading="Results" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground">
                  {hits.map((h) => {
                    const Icon = KIND_ICON[h.kind] ?? FileText;
                    return (
                      <Command.Item key={`${h.kind}-${h.id}`} value={`${h.kind}-${h.id}`} onSelect={() => go(h.href)} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 data-[selected=true]:bg-muted">
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate text-sm">{h.title}</div>
                          {h.snippet && <div className="truncate text-xs text-muted-foreground">{h.snippet}</div>}
                        </div>
                        <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{h.kind}</span>
                      </Command.Item>
                    );
                  })}
                  <Command.Item value="see-all" onSelect={() => go(`/search?q=${encodeURIComponent(q)}`)} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground data-[selected=true]:bg-muted">
                    <Search className="size-4" /> See all results with filters
                  </Command.Item>
                </Command.Group>
              )}
              {q.trim().length < 2 && (
                <>
                  <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground">
                    <Command.Item value="capture" onSelect={onCapture} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted">
                      <Plus className="size-4 text-muted-foreground" /> Capture a thought
                    </Command.Item>
                    <Command.Item value="new-idea" onSelect={() => go("/ideas?new=1")} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted">
                      <Lightbulb className="size-4 text-muted-foreground" /> New idea
                    </Command.Item>
                    <Command.Item value="weekly" onSelect={() => go("/reflections")} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted">
                      <Compass className="size-4 text-muted-foreground" /> This week&apos;s reflection
                    </Command.Item>
                  </Command.Group>
                  <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted-foreground">
                    {NAV_ITEMS.map(({ href, label, icon: Icon, key }) => (
                      <Command.Item key={href} value={`go-${label}`} onSelect={() => go(href)} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted">
                        <Icon className="size-4 text-muted-foreground" /> {label}
                        <span className="ml-auto text-[11px] text-muted-foreground">G then {key.toUpperCase()}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
