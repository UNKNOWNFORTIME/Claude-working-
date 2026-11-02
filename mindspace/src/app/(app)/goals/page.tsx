import Link from "next/link";
import { Target } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listGoals } from "@/server/services/goals";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { FilterSelect } from "@/components/shared/filter-bar";
import { GOAL_KINDS, GOAL_STATUSES, goalKindLabel, goalStatusLabel, goalStatusTone } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { NewGoalButton } from "./new-goal";
import type { GoalKind, GoalStatus } from "@prisma/client";

export const metadata = { title: "Goals" };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = (GOAL_STATUSES.some((s) => s.value === sp.status) || sp.status === "ALL" ? sp.status : undefined) as GoalStatus | "ALL" | undefined;
  const kind = GOAL_KINDS.some((k) => k.value === sp.kind) ? (sp.kind as GoalKind) : undefined;
  const goals = await listGoals(user.id, { status, kind });
  // How many ideas/projects are linked to each goal — shows whether my work supports it
  const linkCounts = await db.entityLink.groupBy({
    by: ["aId"],
    where: { userId: user.id, aType: "GOAL", aId: { in: goals.map((g) => g.id) } },
    _count: true,
  });
  const linked = new Map(linkCounts.map((l) => [l.aId, l._count]));

  return (
    <div>
      <PageHeader title="Goals" description="What you want to achieve — and why it matters." actions={<NewGoalButton />} />
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterSelect param="status" label="Active" options={[{ value: "ALL", label: "All goals" }, ...GOAL_STATUSES.filter((s) => s.value !== "ACTIVE")]} />
        <FilterSelect param="kind" label="All kinds" options={GOAL_KINDS} />
      </div>
      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals here" action={<NewGoalButton />}>
          Goals give your ideas a direction. Link ideas and projects to a goal to see whether they support what matters to you.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {goals.map((g) => (
            <Link key={g.id} href={`/goals/${g.id}`} className="group rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-ring/30 hover:shadow-md">
              <div className="flex items-center gap-2">
                <Badge>{goalKindLabel(g.kind)}</Badge>
                {g.status !== "ACTIVE" && <Badge tone={goalStatusTone(g.status)}>{goalStatusLabel(g.status)}</Badge>}
                {g.targetDate && <span className="ml-auto text-xs text-muted-foreground">By {formatDate(g.targetDate)}</span>}
              </div>
              <h3 className="mt-3 font-medium">{g.title}</h3>
              {g.whyItMatters && <p className="mt-1 line-clamp-2 font-serif text-[15px] italic text-muted-foreground">{g.whyItMatters}</p>}
              <div className="mt-4 flex items-center gap-3">
                <Progress value={g.progress} />
                <span className="text-xs tabular-nums text-muted-foreground">{g.progress}%</span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{g.milestones.filter((m) => m.done).length}/{g.milestones.length} milestones</span>
                <span>{linked.get(g.id) ?? 0} linked items</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
