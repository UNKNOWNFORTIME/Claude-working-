"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Flag, Plus, Trash2 } from "lucide-react";
import { addMilestone, deleteMilestone, updateMilestone } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";

type M = { id: string; title: string; done: boolean; dueDate: Date | null };

export function Milestones({ parent, milestones, path }: { parent: { projectId?: string; goalId?: string }; milestones: M[]; path: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
      router.refresh();
    });

  return (
    <div>
      {milestones.length > 0 && (
        <ol className="relative mb-3 space-y-0.5">
          {milestones.map((m, i) => (
            <li key={m.id} className="group relative flex items-center gap-3 rounded-md py-1.5 pl-1 pr-1 hover:bg-muted/50">
              {i < milestones.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-12px)] w-px bg-border" aria-hidden />}
              <button
                role="checkbox"
                aria-checked={m.done}
                aria-label={`Mark milestone “${m.title}” ${m.done ? "not reached" : "reached"}`}
                onClick={() => act(() => updateMilestone(m.id, { done: !m.done }, path))}
                className={cn("relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-card transition-colors", m.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary")}
              >
                {m.done && <Check className="size-3" strokeWidth={3} />}
              </button>
              <span className={cn("flex-1 text-sm", m.done && "text-muted-foreground line-through")}>{m.title}</span>
              {m.dueDate && <span className="text-xs text-muted-foreground">{formatDate(m.dueDate, { month: "short", day: "numeric" })}</span>}
              <button onClick={() => act(() => deleteMilestone(m.id, path))} className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100" aria-label={`Delete milestone ${m.title}`}>
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          act(async () => {
            const r = await addMilestone(parent, { title, dueDate: due || null });
            if (r.ok) { setTitle(""); setDue(""); }
            return r;
          });
        }}
      >
        <div className="relative flex-1">
          <Flag className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a milestone…" className="pl-8" aria-label="New milestone" />
        </div>
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-36" aria-label="Milestone due date" />
        <Button variant="outline" size="icon" disabled={!title.trim() || pending} aria-label="Add milestone"><Plus /></Button>
      </form>
    </div>
  );
}
