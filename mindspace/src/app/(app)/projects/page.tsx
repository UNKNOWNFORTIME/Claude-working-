import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listProjects, projectProgress } from "@/server/services/projects";
import { PageHeader, EmptyState, Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { FilterSelect, SearchInput } from "@/components/shared/filter-bar";
import { TimeAgo } from "@/components/shared/item-link";
import { PROJECT_STATUSES, projectStatusLabel, projectStatusTone } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { NewProjectButton } from "./new-project";
import type { ProjectStatus } from "@prisma/client";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = (PROJECT_STATUSES.some((s) => s.value === sp.status) || sp.status === "ALL" ? sp.status : "OPEN") as ProjectStatus | "OPEN" | "ALL";
  const projects = await listProjects(user.id, { status, q: sp.q });

  return (
    <div>
      <PageHeader title="Projects" description="Ideas you've decided to act on. Keep it small and moving." actions={<NewProjectButton />} />
      <div className="mb-5 flex flex-wrap gap-2">
        <SearchInput placeholder="Search projects" className="min-w-48 flex-1" />
        <FilterSelect param="status" label="Open projects" options={[{ value: "ALL", label: "All projects" }, ...PROJECT_STATUSES]} />
      </div>
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects here" action={<NewProjectButton />}>
          When an idea is worth pursuing, use “Convert to project” on it — or start one directly.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const pct = projectProgress(p);
            const nextMs = p.milestones.find((m) => !m.done);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-ring/30 hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Badge tone={projectStatusTone(p.status)}>{projectStatusLabel(p.status)}</Badge>
                  {p.deadline && <span className="text-xs text-muted-foreground">Due {formatDate(p.deadline)}</span>}
                  <span className="ml-auto text-xs text-muted-foreground"><TimeAgo date={p.updatedAt} /></span>
                </div>
                <h3 className="mt-3 font-medium">{p.name}</h3>
                {p.objective && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.objective}</p>}
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={pct} />
                  <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{p.tasks.filter((t) => t.done).length}/{p.tasks.length} tasks</span>
                  {nextMs && <span className="truncate pl-3">Next: {nextMs.title}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
