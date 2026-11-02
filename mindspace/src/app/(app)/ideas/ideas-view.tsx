"use client";
import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ClipboardCheck, NotebookPen } from "lucide-react";
import { updateIdea } from "@/server/actions/ideas";
import type { IdeaListItem } from "@/server/services/ideas";
import { IDEA_STAGES, outcomeLabel, outcomeTone, priorityLabel, stageLabel, stageTone } from "@/lib/constants";
import { Badge, Dot, TagChip } from "@/components/ui/badge";
import { TimeAgo } from "@/components/shared/item-link";
import { ScorePill } from "@/components/shared/score-pill";
import { cn } from "@/lib/utils";
import type { IdeaStage } from "@prisma/client";

export const TONE_TEXT: Record<string, string> = {
  emerald: "text-emerald-700 dark:text-emerald-400",
  sky: "text-sky-700 dark:text-sky-400",
  amber: "text-amber-700 dark:text-amber-400",
  rose: "text-rose-700 dark:text-rose-400",
};
const PRIORITY_TONE = { LOW: "zinc", MEDIUM: "slate", HIGH: "amber", URGENT: "rose" } as const;

export function IdeasView({ ideas, view }: { ideas: IdeaListItem[]; view: "cards" | "list" | "board" }) {
  if (view === "list") return <IdeaList ideas={ideas} />;
  if (view === "board") return <IdeaBoard ideas={ideas} />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ideas.map((idea, i) => (
        <motion.div key={idea.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.2 }}>
          <IdeaCard idea={idea} />
        </motion.div>
      ))}
    </div>
  );
}

function IdeaCard({ idea, compact }: { idea: IdeaListItem; compact?: boolean }) {
  const decision = idea.decisions[0];
  return (
    <Link href={`/ideas/${idea.id}`} className="group flex h-full flex-col rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-ring/30 hover:shadow-md">
      <div className="flex items-center gap-2">
        {!compact && <Badge tone={stageTone(idea.stage)}>{stageLabel(idea.stage)}</Badge>}
        {idea.category && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Dot tone={idea.category.color} />{idea.category.name}</span>}
        <span className="ml-auto"><ScorePill score={idea.latestScore} /></span>
      </div>
      <h3 className="mt-2.5 font-medium leading-snug text-foreground">{idea.title}</h3>
      {idea.summary && !compact && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{idea.summary}</p>}
      {decision && !compact && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className={cn("font-medium", TONE_TEXT[outcomeTone(decision.outcome)])}>{outcomeLabel(decision.outcome)}</span>
          {decision.rationale && <> — <span className="line-clamp-1 inline">{decision.rationale}</span></>}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-xs text-muted-foreground">
        {idea.priority !== "MEDIUM" && <Badge tone={PRIORITY_TONE[idea.priority]}>{priorityLabel(idea.priority)}</Badge>}
        {idea.tags.slice(0, compact ? 2 : 4).map((t) => <TagChip key={t.tagId} name={t.tag.name} />)}
        <span className="ml-auto flex items-center gap-2">
          {idea._count.evaluations > 0 && <span className="flex items-center gap-0.5" title="Evaluations"><ClipboardCheck className="size-3" />{idea._count.evaluations}</span>}
          {idea._count.notes > 0 && <span className="flex items-center gap-0.5" title="Notes"><NotebookPen className="size-3" />{idea._count.notes}</span>}
          {!compact && <TimeAgo date={idea.updatedAt} />}
        </span>
      </div>
    </Link>
  );
}

function IdeaList({ ideas }: { ideas: IdeaListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Idea</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">Stage</th>
            <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Category</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Priority</th>
            <th className="px-3 py-2.5 text-right font-medium">Score</th>
            <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ideas.map((i) => (
            <tr key={i.id} className="group hover:bg-muted/50">
              <td className="max-w-0 px-4 py-2.5">
                <Link href={`/ideas/${i.id}`} className="block truncate font-medium group-hover:text-primary">{i.title}</Link>
                {i.summary && <div className="truncate text-xs text-muted-foreground">{i.summary}</div>}
              </td>
              <td className="hidden px-3 py-2.5 md:table-cell"><Badge tone={stageTone(i.stage)}>{stageLabel(i.stage)}</Badge></td>
              <td className="hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">{i.category?.name ?? "—"}</td>
              <td className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">{priorityLabel(i.priority)}</td>
              <td className="px-3 py-2.5 text-right"><ScorePill score={i.latestScore} /></td>
              <td className="hidden px-4 py-2.5 text-right text-xs text-muted-foreground md:table-cell"><TimeAgo date={i.updatedAt} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IdeaBoard({ ideas }: { ideas: IdeaListItem[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [optimistic, move] = useOptimistic(ideas, (state, { id, stage }: { id: string; stage: IdeaStage }) => state.map((i) => (i.id === id ? { ...i, stage } : i)));
  const [over, setOver] = useState<IdeaStage | null>(null);

  const drop = (id: string, stage: IdeaStage) => {
    const idea = optimistic.find((i) => i.id === id);
    if (!idea || idea.stage === stage) return;
    start(async () => {
      move({ id, stage });
      const res = await updateIdea(id, { stage });
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  };

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-thin sm:-mx-8 sm:px-8">
      {IDEA_STAGES.map((s) => {
        const col = optimistic.filter((i) => i.stage === s.value);
        return (
          <section
            key={s.value}
            aria-label={s.label}
            onDragOver={(e) => { e.preventDefault(); setOver(s.value); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); drop(e.dataTransfer.getData("text/idea"), s.value); }}
            className={cn("flex w-64 shrink-0 flex-col rounded-xl bg-muted/50 p-2 transition-colors", over === s.value && "bg-accent ring-2 ring-ring/20")}
          >
            <header className="flex items-center gap-2 px-1.5 pb-2 pt-1 text-xs font-medium text-muted-foreground">
              <Dot tone={s.tone} /> {s.label} <span className="ml-auto tabular-nums">{col.length}</span>
            </header>
            <div className="flex min-h-24 flex-col gap-2">
              {col.map((idea) => (
                <div key={idea.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/idea", idea.id)} className="cursor-grab active:cursor-grabbing">
                  <IdeaCard idea={idea} compact />
                  <label className="sr-only" htmlFor={`stage-${idea.id}`}>Move {idea.title}</label>
                  <select id={`stage-${idea.id}`} value={idea.stage} onChange={(e) => drop(idea.id, e.target.value as IdeaStage)} className="sr-only focus:not-sr-only focus:mt-1 focus:w-full focus:rounded focus:border focus:bg-card focus:text-xs">
                    {IDEA_STAGES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
