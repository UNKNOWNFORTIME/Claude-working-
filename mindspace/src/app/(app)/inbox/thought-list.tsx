"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Archive, ArrowRightLeft, Inbox, Lightbulb, MoreHorizontal, Pin, PinOff, Target, Trash2 } from "lucide-react";
import { setThoughtStatus, thoughtToGoal, thoughtToIdea, trashThought, updateThought } from "@/server/actions/thoughts";
import { restoreItem } from "@/server/actions/misc";
import { THOUGHT_TYPES } from "@/lib/constants";
import type { ThoughtWithTags } from "@/server/services/thoughts";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/shared/tag-input";
import { TimeAgo } from "@/components/shared/item-link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import type { ThoughtType } from "@prisma/client";

export function ThoughtList({ thoughts, highlight, tagSuggestions }: { thoughts: ThoughtWithTags[]; highlight?: string; tagSuggestions: string[] }) {
  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {thoughts.map((t) => (
          <motion.li key={t.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.18 }}>
            <ThoughtCard thought={t} highlighted={highlight === t.id} tagSuggestions={tagSuggestions} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function ThoughtCard({ thought, highlighted, tagSuggestions }: { thought: ThoughtWithTags; highlighted: boolean; tagSuggestions: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(highlighted && thought.status === "INBOX");
  const [content, setContent] = useState(thought.content);
  const [tags, setTags] = useState(thought.tags.map((t) => t.tag.name));
  const [pending, start] = useTransition();

  useEffect(() => {
    if (highlighted) document.getElementById(`t-${thought.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlighted, thought.id]);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
      else {
        if (success) toast.success(success);
        after?.();
        router.refresh();
      }
    });

  const saveContent = () => {
    setEditing(false);
    if (content.trim() && content !== thought.content) act(() => updateThought(thought.id, { content }));
    else setContent(thought.content);
  };

  const linkedIdea = thought.ideas.find((i) => !i.deletedAt);

  return (
    <div
      id={`t-${thought.id}`}
      className={cn(
        "group rounded-xl border bg-card px-4 py-3 transition-colors",
        thought.pinned && "border-amber-500/30 bg-amber-500/[0.03]",
        highlighted && "ring-2 ring-ring/30",
        pending && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Textarea
              autoGrow
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={saveContent}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setContent(thought.content);
                  setEditing(false);
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveContent();
              }}
              className="-mx-2 -my-1 w-[calc(100%+1rem)] border-transparent bg-muted/40 px-2 py-1 text-[15px] shadow-none"
              aria-label="Edit thought"
            />
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="block w-full whitespace-pre-wrap text-left text-[15px] leading-relaxed text-foreground/90" title="Click to edit">
              {thought.content}
            </button>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <TimeAgo date={thought.createdAt} />
            <span aria-hidden>·</span>
            <select
              aria-label="Thought type"
              value={thought.type ?? ""}
              onChange={(e) => act(() => updateThought(thought.id, { type: (e.target.value || null) as ThoughtType | null }))}
              className="rounded bg-transparent py-0.5 pr-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="">Unclassified</option>
              {THOUGHT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {thought.status !== "INBOX" && <Badge tone={thought.status === "PROCESSED" ? "emerald" : "zinc"}>{thought.status === "PROCESSED" ? "Processed" : "Archived"}</Badge>}
            {linkedIdea && (
              <Link href={`/ideas/${linkedIdea.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Lightbulb className="size-3" /> {linkedIdea.title}
              </Link>
            )}
            <TagInput
              value={tags}
              suggestions={tagSuggestions}
              onChange={(next) => {
                setTags(next);
                act(() => updateThought(thought.id, { tags: next }));
              }}
              className="min-w-32 flex-1"
              placeholder="+ tag"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button variant="ghost" size="icon-sm" aria-label={thought.pinned ? "Unpin" : "Pin"} title={thought.pinned ? "Unpin" : "Pin"} onClick={() => act(() => updateThought(thought.id, { pinned: !thought.pinned }))}>
            {thought.pinned ? <PinOff className="text-amber-600" /> : <Pin />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => act(() => thoughtToIdea(thought.id).then((r) => { if (r.ok) router.push(`/ideas/${r.data.id}`); return r; }), "Converted to an idea — original text kept")}>
                <Lightbulb /> Convert to idea
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => act(() => thoughtToGoal(thought.id).then((r) => { if (r.ok) router.push(`/goals/${r.data.id}`); return r; }), "Converted to a goal")}>
                <Target /> Convert to goal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {thought.status === "INBOX" ? (
                <>
                  <DropdownMenuItem onSelect={() => act(() => setThoughtStatus(thought.id, "PROCESSED"), "Marked as processed")}><ArrowRightLeft /> Mark processed</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => act(() => setThoughtStatus(thought.id, "ARCHIVED"), "Archived")}><Archive /> Archive</DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onSelect={() => act(() => setThoughtStatus(thought.id, "INBOX"), "Back in Inbox")}><Inbox /> Back to Inbox</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onSelect={() =>
                  act(() => trashThought(thought.id), undefined, () =>
                    toast("Moved to Trash", { action: { label: "Undo", onClick: async () => { await restoreItem("THOUGHT", thought.id); router.refresh(); } } }),
                  )
                }
              >
                <Trash2 /> Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
