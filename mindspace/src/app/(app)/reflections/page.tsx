import Link from "next/link";
import { CheckCircle2, CircleSlash, Repeat, Target, Telescope, Hourglass, Sparkles } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listDecisions } from "@/server/services/evaluations";
import { decisionSummary, neglectedGoals, recurringThemes } from "@/server/services/insights";
import { getWeeklyReflection, listReflections } from "@/server/services/reflections";
import { PageHeader, SectionLabel } from "@/components/ui/misc";
import { Badge, TagChip } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DECISION_OUTCOMES, outcomeLabel, outcomeTone } from "@/lib/constants";
import { formatDate, startOfWeek } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/item-link";
import { WeeklyReflection } from "./weekly-reflection";
import { Journal } from "./journal";
import { ScorePill } from "@/components/shared/score-pill";
import type { DecisionOutcome } from "@prisma/client";

export const metadata = { title: "Reflections" };

const OUTCOME_ICON = { PURSUE: Sparkles, RESEARCH_FURTHER: Telescope, REVISIT_LATER: Hourglass, NOT_WORTH_PURSUING: CircleSlash } as const;

export default async function ReflectionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; outcome?: string; week?: string; r?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const thisWeek = startOfWeek();
  const week = sp.week && !Number.isNaN(Date.parse(sp.week)) ? startOfWeek(new Date(sp.week + "T12:00:00")) : thisWeek;

  const [weekly, pastWeeks, decisions, summary, themes, neglected, journal] = await Promise.all([
    getWeeklyReflection(user.id, week),
    listReflections(user.id, { kind: "WEEKLY" }),
    listDecisions(user.id),
    decisionSummary(user.id),
    recurringThemes(user.id),
    neglectedGoals(user.id),
    listReflections(user.id, { kind: "GENERAL" }),
  ]);
  const outcomeFilter = DECISION_OUTCOMES.some((o) => o.value === sp.outcome) ? (sp.outcome as DecisionOutcome) : null;
  const shownDecisions = outcomeFilter ? decisions.filter((d) => d.outcome === outcomeFilter) : decisions;
  const abandoned = decisions.filter((d) => d.outcome === "NOT_WORTH_PURSUING");
  const defaultTab = ["decisions", "patterns", "journal"].includes(sp.tab ?? "") ? sp.tab : sp.r ? "journal" : "week";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Reflections" description="Notice how your thinking and decisions evolve. No streaks, no pressure." />
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="week">Weekly reflection</TabsTrigger>
          <TabsTrigger value="decisions">Decision history</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="pt-6">
          <WeeklyReflection
            key={week.toISOString()}
            weekOf={week.toISOString().slice(0, 10)}
            isCurrent={week.getTime() === thisWeek.getTime()}
            existing={weekly ? { id: weekly.id, answers: weekly.answers as Record<string, string>, content: weekly.content } : null}
            pastWeeks={pastWeeks.map((w) => ({ id: w.id, weekOf: w.weekOf!.toISOString().slice(0, 10) }))}
          />
        </TabsContent>

        <TabsContent value="decisions" className="pt-6">
          <div className="mb-4 flex flex-wrap gap-1.5">
            <Link href="/reflections?tab=decisions" className={`rounded-full border px-3 py-1 text-xs ${!outcomeFilter ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>All · {decisions.length}</Link>
            {DECISION_OUTCOMES.map((o) => (
              <Link key={o.value} href={`/reflections?tab=decisions&outcome=${o.value}`} className={`rounded-full border px-3 py-1 text-xs ${outcomeFilter === o.value ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                {o.label} · {summary.counts[o.value] ?? 0}
              </Link>
            ))}
          </div>
          {shownDecisions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No decisions recorded yet. Decisions you make after evaluating ideas show up here.</p>
          ) : (
            <ol className="relative space-y-3 border-l pl-5">
              {shownDecisions.map((d) => {
                const Icon = OUTCOME_ICON[d.outcome];
                return (
                  <li key={d.id} className="relative">
                    <span className="absolute -left-[27px] top-4 size-3 rounded-full border-2 border-background bg-muted-foreground/40" aria-hidden />
                    <Link href={`/ideas/${d.idea.id}?tab=evaluations`} className="block rounded-xl border bg-card p-4 transition-colors hover:border-ring/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <span className="font-medium">{d.idea.title}</span>
                        <Badge tone={outcomeTone(d.outcome)}>{outcomeLabel(d.outcome)}</Badge>
                        {d.evaluation?.overallScore != null && <ScorePill score={d.evaluation.overallScore} />}
                        <span className="ml-auto text-xs text-muted-foreground">{formatDate(d.decidedAt)}</span>
                      </div>
                      {d.rationale ? <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{d.rationale}</p> : <p className="mt-2 text-xs italic text-muted-foreground">No reason recorded.</p>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-5 pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {DECISION_OUTCOMES.map((o) => {
              const Icon = OUTCOME_ICON[o.value];
              return (
                <Link key={o.value} href={`/reflections?tab=decisions&outcome=${o.value}`} className="rounded-xl border bg-card p-4 hover:border-ring/30">
                  <Icon className="size-4 text-muted-foreground" />
                  <div className="mt-2 font-serif text-3xl tabular-nums">{summary.counts[o.value] ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{o.label}</div>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CircleSlash className="size-4 text-muted-foreground" /> Why I said no</CardTitle></CardHeader>
              <CardContent>
                {abandoned.length === 0 ? <p className="text-sm text-muted-foreground">No ideas set aside yet. Saying no clearly is a skill — it frees time for what matters.</p> : (
                  <ul className="space-y-3">
                    {abandoned.slice(0, 6).map((d) => (
                      <li key={d.id} className="text-sm">
                        <Link href={`/ideas/${d.idea.id}`} className="font-medium hover:text-primary">{d.idea.title}</Link>
                        <p className="text-muted-foreground">{d.rationale || <span className="italic">No reason recorded</span>}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Repeat className="size-4 text-muted-foreground" /> Recurring in your thinking</CardTitle></CardHeader>
              <CardContent>
                {themes.words.length === 0 && themes.topTags.length === 0 ? <p className="text-sm text-muted-foreground">Patterns appear once you&apos;ve captured more thoughts.</p> : (
                  <div className="space-y-3">
                    {themes.topTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">{themes.topTags.map((t) => <Link key={t.name} href={`/search?q=${encodeURIComponent(t.name)}`}><TagChip name={`${t.name} · ${t.count}`} /></Link>)}</div>
                    )}
                    {themes.words.length > 0 && (
                      <div>
                        <SectionLabel className="mb-1.5">Words that keep coming up (last 6 months)</SectionLabel>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {themes.words.map((w) => (
                            <Link key={w.word} href={`/search?q=${encodeURIComponent(w.word)}`} className="text-sm hover:text-primary" style={{ fontSize: `${Math.min(0.8 + w.count * 0.06, 1.3)}rem` }}>
                              {w.word}<sup className="ml-0.5 text-[10px] text-muted-foreground">{w.count}</sup>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-4 text-muted-foreground" /> Goals that may need attention</CardTitle></CardHeader>
              <CardContent>
                {neglected.length === 0 ? <p className="text-sm text-muted-foreground">Every active goal has seen some attention in the last 30 days.</p> : (
                  <ul className="space-y-2">
                    {neglected.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
                        <Link href={`/goals/${g.id}`} className="truncate hover:text-primary">{g.title}</Link>
                        <span className="shrink-0 text-xs text-muted-foreground">untouched <TimeAgo date={g.updatedAt} /></span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-4 text-muted-foreground" /> Completed</CardTitle></CardHeader>
              <CardContent>
                {summary.completedProjects.length === 0 && summary.achievedGoals.length === 0 ? <p className="text-sm text-muted-foreground">Finished projects and achieved goals will collect here.</p> : (
                  <ul className="space-y-2 text-sm">
                    {summary.completedProjects.map((p) => <li key={p.id} className="flex justify-between gap-2"><Link href={`/projects/${p.id}`} className="truncate hover:text-primary">{p.name}</Link><span className="text-xs text-muted-foreground">Project · {formatDate(p.updatedAt)}</span></li>)}
                    {summary.achievedGoals.map((g) => <li key={g.id} className="flex justify-between gap-2"><Link href={`/goals/${g.id}`} className="truncate hover:text-primary">{g.title}</Link><span className="text-xs text-muted-foreground">Goal · {formatDate(g.updatedAt)}</span></li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="journal" className="pt-6">
          <Journal entries={journal.map((j) => ({ id: j.id, title: j.title, content: j.content, createdAt: j.createdAt }))} highlight={sp.r} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
