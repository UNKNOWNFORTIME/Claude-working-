import Link from "next/link";
import { ArrowRight, CalendarClock, FolderKanban, Lightbulb, Sparkles, Target, Telescope, Hourglass, Inbox as InboxIcon } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getDashboard } from "@/server/services/dashboard";
import { projectProgress } from "@/server/services/projects";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, TagChip } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { QuickCapture } from "@/components/shared/quick-capture";
import { ListRow, TimeAgo } from "@/components/shared/item-link";
import { ENTITY_LABELS, entityHref, goalKindLabel, thoughtTypeLabel } from "@/lib/constants";
import { firstLine, formatDate } from "@/lib/utils";
import { TaskCheckbox } from "./projects/[id]/task-checkbox";

export const metadata = { title: "Dashboard" };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const d = await getDashboard(user.id);
  const tags = await db.tag.findMany({ where: { userId: user.id }, select: { name: true } });

  const worthThinking = [
    ...d.awaitingAction.map((i) => ({ id: i.id, title: i.title, why: "Marked worth pursuing — not yet a project", icon: Sparkles, decision: i.decisions[0] })),
    ...d.revisitDue.map((i) => ({ id: i.id, title: i.title, why: "You planned to revisit this", icon: Hourglass, decision: i.decisions[0] })),
    ...d.researchDecisions.map((i) => ({ id: i.id, title: i.title, why: "Marked for further research", icon: Telescope, decision: i.decisions[0] })),
    ...d.dormant.map((i) => ({ id: i.id, title: i.title, why: `Untouched since ${formatDate(i.updatedAt, { month: "short", day: "numeric" })}`, icon: CalendarClock, decision: undefined })),
  ].filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i).slice(0, 6);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-muted-foreground" suppressHydrationWarning>{formatDate(new Date(), { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl" suppressHydrationWarning>
          {greeting()}{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
        </h1>
      </header>

      <section aria-label="Quick capture" className="max-w-3xl">
        <QuickCapture tagSuggestions={tags.map((t) => t.name)} />
      </section>

      {worthThinking.length > 0 && (
        <section aria-labelledby="worth-thinking">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="worth-thinking" className="font-serif text-xl">Things worth thinking about</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {worthThinking.map((w) => (
              <Link key={w.id} href={`/ideas/${w.id}`} className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-ring/30 hover:shadow-md">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <w.icon className="size-3.5" /> {w.why}
                </div>
                <div className="mt-2 font-medium leading-snug">{w.title}</div>
                {w.decision?.rationale && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">“{w.decision.rationale}”</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><InboxIcon className="size-4 text-muted-foreground" /> Recently captured</CardTitle>
            <Link href="/inbox" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Inbox{d.inboxCount ? ` · ${d.inboxCount}` : ""} <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {d.recentThoughts.length === 0 ? (
              <Empty>Your inbox is clear. Capture anything above — sort it out later.</Empty>
            ) : (
              <ul className="divide-y">
                {d.recentThoughts.map((t) => (
                  <li key={t.id}>
                    <Link href={`/inbox?thought=${t.id}`} className="block py-2.5 transition-colors hover:text-foreground">
                      <p className="line-clamp-2 text-sm leading-relaxed text-foreground/85">{t.content}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <TimeAgo date={t.createdAt} />
                        {t.type && <span>· {thoughtTypeLabel(t.type)}</span>}
                        {t.tags.map((x) => <TagChip key={x.tagId} name={x.tag.name} />)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-muted-foreground" /> Upcoming tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {d.tasks.length === 0 ? (
              <Empty>No open tasks in active projects.</Empty>
            ) : (
              <ul className="space-y-1">
                {d.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 py-1">
                    <TaskCheckbox id={t.id} done={t.done} projectId={t.projectId ?? undefined} />
                    <div className="min-w-0">
                      <div className="text-sm leading-snug">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.project && <Link href={`/projects/${t.project.id}`} className="hover:text-foreground">{t.project.name}</Link>}
                        {t.dueDate && <span suppressHydrationWarning> · due {formatDate(t.dueDate, { month: "short", day: "numeric" })}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="size-4 text-muted-foreground" /> Exploring</CardTitle>
            <Link href="/ideas?stage=EXPLORING" className="text-xs text-muted-foreground hover:text-foreground">All</Link>
          </CardHeader>
          <CardContent>
            {d.exploring.length === 0 ? <Empty>No ideas in exploration right now.</Empty> : d.exploring.map((i) => (
              <ListRow key={i.id} href={`/ideas/${i.id}`} title={i.title} meta={<>{i.category?.name ? `${i.category.name} · ` : ""}updated <TimeAgo date={i.updatedAt} /></>} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Hourglass className="size-4 text-muted-foreground" /> Awaiting evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            {d.awaitingEvaluation.length === 0 ? <Empty>Nothing waiting. Nice.</Empty> : d.awaitingEvaluation.map((i) => (
              <ListRow key={i.id} href={`/ideas/${i.id}/evaluate`} title={i.title} meta={<>captured <TimeAgo date={i.createdAt} /></>} right={<span className="text-xs text-primary">Evaluate</span>} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FolderKanban className="size-4 text-muted-foreground" /> Active projects</CardTitle>
            <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground">All</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.activeProjects.length === 0 ? <Empty>No active projects.</Empty> : d.activeProjects.map((p) => {
              const pct = projectProgress(p);
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-md p-1 -m-1 hover:bg-muted/60">
                  <div className="flex items-center justify-between text-sm"><span className="truncate">{p.name}</span><span className="text-xs tabular-nums text-muted-foreground">{pct}%</span></div>
                  <Progress value={pct} className="mt-1.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="size-4 text-muted-foreground" /> Goals</CardTitle>
            <Link href="/goals" className="text-xs text-muted-foreground hover:text-foreground">All</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.goals.length === 0 ? <Empty>What do you want to achieve? <Link className="text-primary" href="/goals">Add a goal</Link>.</Empty> : d.goals.map((g) => (
              <Link key={g.id} href={`/goals/${g.id}`} className="block rounded-md p-1 -m-1 hover:bg-muted/60">
                <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{g.title}</span><Badge>{goalKindLabel(g.kind)}</Badge></div>
                <Progress value={g.progress} className="mt-1.5" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recently updated</CardTitle></CardHeader>
          <CardContent>
            {d.recentlyUpdated.length === 0 ? <Empty>Nothing yet.</Empty> : (
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {d.recentlyUpdated.map((r) => (
                  <ListRow key={`${r.type}${r.id}`} href={entityHref(r.type, r.id)} title={firstLine(r.title)} meta={<>{ENTITY_LABELS[r.type]} · <TimeAgo date={r.updatedAt} /></>} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
