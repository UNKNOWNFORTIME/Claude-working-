"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, ExternalLink, FolderKanban, Link2, MoreHorizontal, NotebookPen, Plus, Scale, Sparkles, Trash2, Inbox, X } from "lucide-react";
import { updateIdea, ideaToProject, trashIdea } from "@/server/actions/ideas";
import { restoreItem } from "@/server/actions/misc";
import type { IdeaDetail } from "@/server/services/ideas";
import type { RelatedItem } from "@/server/services/links";
import { useAutosave } from "@/hooks/use-autosave";
import { IDEA_STAGES, PRIORITIES, outcomeLabel, projectStatusLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { SectionLabel } from "@/components/ui/misc";
import { SaveIndicator } from "@/components/shared/save-indicator";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { TagInput } from "@/components/shared/tag-input";
import { ScorePill } from "@/components/shared/score-pill";
import { TimeAgo } from "@/components/shared/item-link";
import { RelatedItems } from "@/components/shared/related-items";
import { NotesPanel } from "./notes-panel";
import { EvaluationsPanel } from "./evaluations-panel";
import { AIPanel, type ConversationView, type ServerAIInfo } from "./ai-panel";
import type { IdeaStage, Priority } from "@prisma/client";

type Ref = { title: string; url: string };
type Patch = { title: string; summary: string; description: string; motivation: string; references: Ref[]; tags: string[]; stage: IdeaStage; priority: Priority; categoryId: string | null };

export function IdeaWorkspace({ idea, categories, related, conversations, ai, tagSuggestions, otherIdeas, initialTab, openConversation, autoRun }: {
  idea: IdeaDetail; categories: { id: string; name: string; color: string }[]; related: RelatedItem[]; conversations: ConversationView[]; ai: ServerAIInfo;
  tagSuggestions: string[]; otherIdeas: { id: string; title: string }[]; initialTab?: string; openConversation?: string; autoRun?: "critique";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    title: idea.title,
    summary: idea.summary,
    description: idea.description,
    motivation: idea.motivation,
    references: (idea.references as Ref[]) ?? [],
    tags: idea.tags.map((t) => t.tag.name),
    stage: idea.stage,
    priority: idea.priority,
    categoryId: idea.categoryId,
  });
  // Stage can change elsewhere (e.g. recording a decision) — keep it in sync.
  useEffect(() => setF((s) => ({ ...s, stage: idea.stage })), [idea.stage]);
  const autosave = useAutosave<Patch>(async (patch) => {
    const res = await updateIdea(idea.id, patch);
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  });

  const change = <K extends keyof Patch>(key: K, value: Patch[K], immediate = false) => {
    setF((s) => ({ ...s, [key]: value }));
    autosave.queue({ [key]: value } as Partial<Patch>);
    if (immediate) void autosave.flush().then(() => router.refresh());
  };

  const [newRef, setNewRef] = useState({ title: "", url: "" });
  const addRef = () => {
    try {
      new URL(newRef.url);
    } catch {
      return toast.error("Enter a full URL, starting with https://");
    }
    change("references", [...f.references, { title: newRef.title.trim(), url: newRef.url.trim() }], true);
    setNewRef({ title: "", url: "" });
  };

  const convert = () =>
    start(async () => {
      const res = await ideaToProject(idea.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Project created — the idea and its evaluations stay linked");
      router.push(`/projects/${res.data.id}`);
    });

  const latestEval = idea.evaluations[0];
  const latestDecision = idea.decisions[0];

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0">
        {/* Title + actions */}
        <div className="flex items-start gap-3">
          <Textarea
            autoGrow
            rows={1}
            value={f.title}
            onChange={(e) => change("title", e.target.value.replace(/\n/g, " "))}
            onBlur={() => autosave.flush()}
            aria-label="Idea title"
            className="min-h-0 flex-1 resize-none border-transparent bg-transparent px-0 py-0 font-serif text-3xl leading-tight tracking-tight shadow-none hover:border-transparent focus-visible:ring-0 sm:text-[2.1rem]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions" className="mt-1"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                destructive
                onSelect={() =>
                  start(async () => {
                    const res = await trashIdea(idea.id);
                    if (!res.ok) return void toast.error(res.error);
                    toast("Idea moved to Trash", { action: { label: "Undo", onClick: async () => { await restoreItem("IDEA", idea.id); router.push(`/ideas/${idea.id}`); } } });
                    router.push("/ideas");
                  })
                }
              >
                <Trash2 /> Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Textarea
          autoGrow
          rows={1}
          value={f.summary}
          onChange={(e) => change("summary", e.target.value)}
          onBlur={() => autosave.flush()}
          placeholder="Add a one-line summary…"
          aria-label="Summary"
          className="mt-2 min-h-0 resize-none border-transparent bg-transparent px-0 py-0 text-base text-muted-foreground shadow-none hover:border-transparent focus-visible:ring-0"
        />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href={`/ideas/${idea.id}/evaluate`}><Scale /> {idea.evaluations.length ? "Evaluate again" : "Evaluate idea"}</Link>
          </Button>
          {idea.projects.length === 0 ? (
            <Button size="sm" variant={idea.stage === "WORTH_PURSUING" ? "soft" : "outline"} onClick={convert} loading={pending}>
              <FolderKanban /> Convert to project
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href={`/projects/${idea.projects[0].id}`}><FolderKanban /> Open project</Link>
            </Button>
          )}
          <SaveIndicator state={autosave.state} error={autosave.error} className="ml-auto" />
        </div>

        <Tabs defaultValue={["notes", "evaluations", "ai", "related"].includes(initialTab ?? "") ? initialTab : "overview"} className="mt-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes"><NotebookPen /> Notes {idea.notes.length > 0 && <span className="text-muted-foreground">{idea.notes.length}</span>}</TabsTrigger>
            <TabsTrigger value="evaluations"><ClipboardCheck /> Evaluations & decisions {idea.evaluations.length > 0 && <span className="text-muted-foreground">{idea.evaluations.length}</span>}</TabsTrigger>
            <TabsTrigger value="ai"><Sparkles /> Thinking partner</TabsTrigger>
            <TabsTrigger value="related"><Link2 /> Related {related.length > 0 && <span className="text-muted-foreground">{related.length}</span>}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 pt-6">
            <section>
              <SectionLabel className="mb-2">Description</SectionLabel>
              <MarkdownEditor
                label="Description"
                value={f.description}
                onChange={(v) => change("description", v)}
                onBlur={() => autosave.flush()}
                placeholder="Describe the idea in as much detail as you like. Markdown supported."
                minRows={8}
                className="-mx-3"
              />
            </section>
            <section>
              <SectionLabel className="mb-2">Why I care</SectionLabel>
              <MarkdownEditor
                label="Personal motivation"
                value={f.motivation}
                onChange={(v) => change("motivation", v)}
                onBlur={() => autosave.flush()}
                placeholder="What draws you to this? What would it mean to you if it worked?"
                minRows={3}
                className="-mx-3"
              />
            </section>
            <section>
              <SectionLabel className="mb-2">Links & references</SectionLabel>
              {f.references.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {f.references.map((r, i) => (
                    <li key={`${r.url}${i}`} className="group flex items-center gap-2 text-sm">
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{r.title || r.url}</a>
                      <button onClick={() => change("references", f.references.filter((_, j) => j !== i), true)} className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 focus:opacity-100" aria-label="Remove link">
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); addRef(); }}>
                <Input placeholder="Title (optional)" value={newRef.title} onChange={(e) => setNewRef({ ...newRef, title: e.target.value })} className="sm:w-48" aria-label="Link title" />
                <Input placeholder="https://…" value={newRef.url} onChange={(e) => setNewRef({ ...newRef, url: e.target.value })} type="url" aria-label="Link URL" />
                <Button variant="outline" size="default" disabled={!newRef.url}><Plus /> Add</Button>
              </form>
            </section>
            {idea.sourceThought && (
              <section>
                <SectionLabel className="mb-2 flex items-center gap-1.5"><Inbox className="size-3" /> Originally captured <span className="normal-case tracking-normal">· {formatDate(idea.sourceThought.createdAt)}</span></SectionLabel>
                <blockquote className="whitespace-pre-wrap rounded-lg border-l-2 border-primary/30 bg-muted/40 px-4 py-3 font-serif text-[15px] italic text-foreground/80">
                  {idea.sourceThought.content}
                </blockquote>
              </section>
            )}
          </TabsContent>

          <TabsContent value="notes" className="pt-6">
            <NotesPanel ideaId={idea.id} notes={idea.notes} />
          </TabsContent>
          <TabsContent value="evaluations" className="pt-6">
            <EvaluationsPanel idea={idea} />
          </TabsContent>
          <TabsContent value="ai" className="pt-6">
            <AIPanel ideaId={idea.id} conversations={conversations} ai={ai} otherIdeas={otherIdeas} hasEvaluation={idea.evaluations.length > 0} openConversation={openConversation} autoRun={autoRun} />
          </TabsContent>
          <TabsContent value="related" className="pt-6">
            <RelatedItems type="IDEA" id={idea.id} items={related} path={`/ideas/${idea.id}`} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Properties sidebar */}
      <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <Prop label="Stage">
            <Select value={f.stage} onChange={(e) => change("stage", e.target.value as IdeaStage, true)} className="h-8 w-full text-[13px]" aria-label="Stage">
              {IDEA_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Prop>
          <Prop label="Priority">
            <Select value={f.priority} onChange={(e) => change("priority", e.target.value as Priority, true)} className="h-8 w-full text-[13px]" aria-label="Priority">
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Prop>
          <Prop label="Category">
            <Select value={f.categoryId ?? ""} onChange={(e) => change("categoryId", e.target.value || null, true)} className="h-8 w-full text-[13px]" aria-label="Category">
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {categories.length === 0 && <Link href="/settings#categories" className="mt-1 block text-[11px] text-muted-foreground hover:text-foreground">Create categories in Settings</Link>}
          </Prop>
          <Prop label="Tags">
            <TagInput value={f.tags} onChange={(t) => change("tags", t, true)} suggestions={tagSuggestions} className="-mx-1" />
          </Prop>
        </div>

        <div className="space-y-2.5 px-1 text-[13px]">
          <Meta label="Latest score">{idea.latestScore != null ? <ScorePill score={idea.latestScore} /> : latestEval ? <span className="text-muted-foreground">Draft in progress</span> : <span className="text-muted-foreground">Not evaluated</span>}</Meta>
          {latestDecision && <Meta label="Decision"><span>{outcomeLabel(latestDecision.outcome)}</span></Meta>}
          <Meta label="Created">{formatDate(idea.createdAt)}</Meta>
          <Meta label="Updated"><TimeAgo date={idea.updatedAt} /></Meta>
          {idea.projects.map((p) => (
            <Meta key={p.id} label="Project">
              <Link href={`/projects/${p.id}`} className="text-primary hover:underline">{p.name}</Link> <span className="text-muted-foreground">· {projectStatusLabel(p.status)}</span>
            </Meta>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right">{children}</span>
    </div>
  );
}
