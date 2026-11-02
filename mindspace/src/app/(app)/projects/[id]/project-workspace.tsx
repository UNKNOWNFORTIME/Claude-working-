"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lightbulb, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { addTask, deleteTask, trashProject, updateProject, updateTask } from "@/server/actions/projects";
import { restoreItem } from "@/server/actions/misc";
import type { getProjectDetail } from "@/server/services/projects";
import type { RelatedItem } from "@/server/services/links";
import { useAutosave } from "@/hooks/use-autosave";
import { PROJECT_STATUSES } from "@/lib/constants";
import { cn, formatDate, toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Progress, SectionLabel } from "@/components/ui/misc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { SaveIndicator } from "@/components/shared/save-indicator";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Milestones } from "@/components/shared/milestones";
import { RelatedItems } from "@/components/shared/related-items";
import { EntityReflections } from "@/components/shared/entity-reflections";
import { ScorePill } from "@/components/shared/score-pill";
import { TaskCheckbox } from "./task-checkbox";
import type { ProjectStatus } from "@prisma/client";

type Project = Awaited<ReturnType<typeof getProjectDetail>>;
type Patch = { name: string; description: string; objective: string; expectedOutcome: string; notes: string; status: ProjectStatus; deadline: string | null };

export function ProjectWorkspace({ project, related, reflections }: { project: Project; related: RelatedItem[]; reflections: { id: string; content: string; createdAt: Date }[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: project.name, description: project.description, objective: project.objective, expectedOutcome: project.expectedOutcome,
    notes: project.notes, status: project.status, deadline: toDateInput(project.deadline),
  });
  useEffect(() => setF((s) => ({ ...s, status: project.status })), [project.status]);
  const autosave = useAutosave<Patch>(async (patch) => {
    const r = await updateProject(project.id, patch);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
  const change = <K extends keyof Patch>(k: K, v: Patch[K], immediate = false) => {
    setF((s) => ({ ...s, [k]: v ?? "" }));
    autosave.queue({ [k]: v } as Partial<Patch>);
    if (immediate) void autosave.flush().then(() => router.refresh());
  };

  const items = [...project.tasks, ...project.milestones];
  const pct = items.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : 0;
  const path = `/projects/${project.id}`;
  const [, start] = useTransition();

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-10">
        <div>
          <div className="flex items-start gap-3">
            <Textarea
              autoGrow rows={1} value={f.name}
              onChange={(e) => change("name", e.target.value.replace(/\n/g, " "))} onBlur={() => autosave.flush()}
              aria-label="Project name"
              className="min-h-0 flex-1 resize-none border-transparent bg-transparent px-0 py-0 font-serif text-3xl leading-tight tracking-tight shadow-none hover:border-transparent focus-visible:ring-0"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="More actions" className="mt-1"><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem destructive onSelect={() => start(async () => {
                  const r = await trashProject(project.id);
                  if (!r.ok) return void toast.error(r.error);
                  toast("Project moved to Trash", { action: { label: "Undo", onClick: async () => { await restoreItem("PROJECT", project.id); router.push(path); } } });
                  router.push("/projects");
                })}><Trash2 /> Move to Trash</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Progress value={pct} className="max-w-xs" />
            <span className="text-sm tabular-nums text-muted-foreground">{pct}% done</span>
            <SaveIndicator state={autosave.state} error={autosave.error} className="ml-auto" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <SectionLabel className="mb-1.5">Objective</SectionLabel>
            <Textarea autoGrow rows={2} value={f.objective} onChange={(e) => change("objective", e.target.value)} onBlur={() => autosave.flush()} placeholder="What are you trying to achieve?" aria-label="Objective" />
          </div>
          <div>
            <SectionLabel className="mb-1.5">Expected outcome</SectionLabel>
            <Textarea autoGrow rows={2} value={f.expectedOutcome} onChange={(e) => change("expectedOutcome", e.target.value)} onBlur={() => autosave.flush()} placeholder="What will exist when this is done?" aria-label="Expected outcome" />
          </div>
        </div>

        <section>
          <h2 className="mb-3 font-serif text-xl">Milestones</h2>
          <Milestones parent={{ projectId: project.id }} milestones={project.milestones} path={path} />
        </section>

        <section>
          <h2 className="mb-3 font-serif text-xl">Tasks</h2>
          <TaskList project={project} />
        </section>

        <section>
          <SectionLabel className="mb-2">Description</SectionLabel>
          <MarkdownEditor label="Description" value={f.description} onChange={(v) => change("description", v)} onBlur={() => autosave.flush()} placeholder="Scope, approach, constraints…" minRows={3} className="-mx-3" />
        </section>
        <section>
          <SectionLabel className="mb-2">Notes</SectionLabel>
          <MarkdownEditor label="Notes" value={f.notes} onChange={(v) => change("notes", v)} onBlur={() => autosave.flush()} placeholder="Working notes, links, decisions…" minRows={4} className="-mx-3" />
        </section>
        <section>
          <h2 className="mb-3 font-serif text-xl">Reflections</h2>
          <EntityReflections entityType="PROJECT" entityId={project.id} reflections={reflections} path={path} prompt="How is it going? What's working, what isn't, what did you learn?" />
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</div>
            <Select value={f.status} onChange={(e) => change("status", e.target.value as ProjectStatus, true)} className="h-8 w-full text-[13px]" aria-label="Status">
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deadline</div>
            <Input type="date" value={f.deadline} onChange={(e) => change("deadline", e.target.value || null, true)} className="h-8 text-[13px]" aria-label="Deadline" />
          </div>
        </div>
        {project.idea && !project.idea.deletedAt && (
          <Link href={`/ideas/${project.idea.id}`} className="block rounded-xl border bg-card p-4 transition-colors hover:border-ring/30">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"><Lightbulb className="size-3" /> From idea</div>
            <div className="mt-1.5 flex items-center gap-2 text-sm font-medium">{project.idea.title}<ScorePill score={project.idea.latestScore} className="ml-auto" /></div>
            <div className="mt-1 text-xs text-muted-foreground">See the original idea, evaluations and decision</div>
          </Link>
        )}
        <div>
          <SectionLabel className="mb-2">Related</SectionLabel>
          <RelatedItems type="PROJECT" id={project.id} items={related} path={path} compact />
        </div>
        <p className="px-1 text-xs text-muted-foreground">Created {formatDate(project.createdAt)}</p>
      </aside>
    </div>
  );
}

function TaskList({ project }: { project: Project }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [pending, start] = useTransition();
  const open = project.tasks.filter((t) => !t.done);
  const done = project.tasks.filter((t) => t.done);
  const msName = (id: string | null) => project.milestones.find((m) => m.id === id)?.title;

  const row = (t: Project["tasks"][number]) => (
    <li key={t.id} className="group flex items-start gap-3 rounded-md px-1 py-1.5 hover:bg-muted/50">
      <TaskCheckbox id={t.id} done={t.done} projectId={project.id} label={t.title} />
      <EditableTitle task={t} projectId={project.id} />
      {msName(t.milestoneId) && <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">{msName(t.milestoneId)}</span>}
      {t.dueDate && <span className={cn("shrink-0 text-xs text-muted-foreground", !t.done && new Date(t.dueDate) < new Date() && "text-destructive")}>{formatDate(t.dueDate, { month: "short", day: "numeric" })}</span>}
      <button onClick={() => start(async () => { const r = await deleteTask(t.id, project.id); if (!r.ok) toast.error(r.error); router.refresh(); })} className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100" aria-label={`Delete task ${t.title}`}>
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );

  return (
    <div>
      <form
        className="mb-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          start(async () => {
            const r = await addTask(project.id, { title, dueDate: due || null, milestoneId: milestoneId || null });
            if (!r.ok) return void toast.error(r.error);
            setTitle("");
            setDue("");
            router.refresh();
          });
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" className="min-w-48 flex-1" aria-label="New task" />
        {project.milestones.length > 0 && (
          <Select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className="w-40 text-[13px]" aria-label="Milestone">
            <option value="">No milestone</option>
            {project.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </Select>
        )}
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-36" aria-label="Due date" />
        <Button variant="outline" size="icon" disabled={!title.trim() || pending} aria-label="Add task"><Plus /></Button>
      </form>
      {project.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet. What&apos;s the very next physical action?</p>
      ) : (
        <>
          <ul>{open.map(row)}</ul>
          {done.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">{done.length} completed</summary>
              <ul className="mt-1 opacity-70">{done.map(row)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function EditableTitle({ task, projectId }: { task: { id: string; title: string; done: boolean }; projectId: string }) {
  const router = useRouter();
  const [v, setV] = useState(task.title);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={async () => {
        if (v.trim() && v !== task.title) {
          const r = await updateTask(task.id, { title: v }, projectId);
          if (!r.ok) toast.error(r.error);
          router.refresh();
        } else setV(task.title);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      aria-label="Task title"
      className={cn("min-w-0 flex-1 bg-transparent text-sm outline-none", task.done && "text-muted-foreground line-through")}
    />
  );
}
