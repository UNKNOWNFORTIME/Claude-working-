"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { trashGoal, updateGoal } from "@/server/actions/goals";
import { restoreItem } from "@/server/actions/misc";
import type { getGoalDetail } from "@/server/services/goals";
import type { RelatedItem } from "@/server/services/links";
import { useAutosave } from "@/hooks/use-autosave";
import { GOAL_KINDS, GOAL_STATUSES } from "@/lib/constants";
import { formatDate, toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/misc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { SaveIndicator } from "@/components/shared/save-indicator";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Milestones } from "@/components/shared/milestones";
import { RelatedItems } from "@/components/shared/related-items";
import { EntityReflections } from "@/components/shared/entity-reflections";
import type { GoalKind, GoalStatus } from "@prisma/client";

type Goal = Awaited<ReturnType<typeof getGoalDetail>>;
type Patch = { title: string; whyItMatters: string; notes: string; kind: GoalKind; status: GoalStatus; progress: number; targetDate: string | null };

export function GoalWorkspace({ goal, related, reflections }: { goal: Goal; related: RelatedItem[]; reflections: { id: string; content: string; createdAt: Date }[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [f, setF] = useState({ title: goal.title, whyItMatters: goal.whyItMatters, notes: goal.notes, kind: goal.kind, status: goal.status, progress: goal.progress, targetDate: toDateInput(goal.targetDate) });
  const autosave = useAutosave<Patch>(async (patch) => {
    const r = await updateGoal(goal.id, patch);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
  const change = <K extends keyof Patch>(k: K, v: Patch[K], immediate = false) => {
    setF((s) => ({ ...s, [k]: v ?? "" }));
    autosave.queue({ [k]: v } as Partial<Patch>);
    if (immediate) void autosave.flush().then(() => router.refresh());
  };
  const path = `/goals/${goal.id}`;
  const msDone = goal.milestones.filter((m) => m.done).length;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-10">
        <div>
          <div className="flex items-start gap-3">
            <Textarea autoGrow rows={1} value={f.title} onChange={(e) => change("title", e.target.value.replace(/\n/g, " "))} onBlur={() => autosave.flush()} aria-label="Goal"
              className="min-h-0 flex-1 resize-none border-transparent bg-transparent px-0 py-0 font-serif text-3xl leading-tight tracking-tight shadow-none hover:border-transparent focus-visible:ring-0" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="More actions" className="mt-1"><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem destructive onSelect={() => start(async () => {
                  const r = await trashGoal(goal.id);
                  if (!r.ok) return void toast.error(r.error);
                  toast("Goal moved to Trash", { action: { label: "Undo", onClick: async () => { await restoreItem("GOAL", goal.id); router.push(path); } } });
                  router.push("/goals");
                })}><Trash2 /> Move to Trash</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-2 flex justify-end"><SaveIndicator state={autosave.state} error={autosave.error} /></div>
        </div>

        <section>
          <SectionLabel className="mb-2">Why it matters</SectionLabel>
          <Textarea autoGrow rows={3} value={f.whyItMatters} onChange={(e) => change("whyItMatters", e.target.value)} onBlur={() => autosave.flush()}
            placeholder="What changes for you when you achieve this?" aria-label="Why it matters"
            className="border-transparent bg-muted/30 font-serif text-lg italic leading-relaxed shadow-none hover:border-border" />
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl">Progress</h2>
            <span className="font-serif text-2xl tabular-nums">{f.progress}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={f.progress} onChange={(e) => change("progress", Number(e.target.value))} onPointerUp={() => autosave.flush()}
            className="w-full accent-[var(--color-primary)]" aria-label="Progress percentage" />
          {goal.milestones.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {msDone} of {goal.milestones.length} milestones reached.{" "}
              <button className="text-primary hover:underline" onClick={() => change("progress", Math.round((msDone / goal.milestones.length) * 100), true)}>Set from milestones</button>
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-serif text-xl">Milestones</h2>
          <Milestones parent={{ goalId: goal.id }} milestones={goal.milestones} path={path} />
        </section>

        <section>
          <h2 className="mb-1 font-serif text-xl">Supporting ideas & projects</h2>
          <p className="mb-3 text-sm text-muted-foreground">Link the ideas and projects that move this goal forward.</p>
          <RelatedItems type="GOAL" id={goal.id} items={related} path={path} />
        </section>

        <section>
          <SectionLabel className="mb-2">Notes</SectionLabel>
          <MarkdownEditor label="Notes" value={f.notes} onChange={(v) => change("notes", v)} onBlur={() => autosave.flush()} placeholder="Plans, thoughts, resources…" minRows={4} className="-mx-3" />
        </section>

        <section>
          <h2 className="mb-3 font-serif text-xl">Reflections</h2>
          <EntityReflections entityType="GOAL" entityId={goal.id} reflections={reflections} path={path} prompt="How do you feel about this goal now? Still the right goal?" />
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</div>
            <Select value={f.status} onChange={(e) => change("status", e.target.value as GoalStatus, true)} className="h-8 w-full text-[13px]" aria-label="Status">
              {GOAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Kind</div>
            <Select value={f.kind} onChange={(e) => change("kind", e.target.value as GoalKind, true)} className="h-8 w-full text-[13px]" aria-label="Kind">
              {GOAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Target date</div>
            <Input type="date" value={f.targetDate} onChange={(e) => change("targetDate", e.target.value || null, true)} className="h-8 text-[13px]" aria-label="Target date" />
          </div>
        </div>
        <p className="px-1 text-xs text-muted-foreground">Created {formatDate(goal.createdAt)}</p>
      </aside>
    </div>
  );
}
