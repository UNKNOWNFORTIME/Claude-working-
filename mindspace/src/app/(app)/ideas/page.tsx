import { Lightbulb } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listIdeas, type IdeaFilter, type IdeaSort } from "@/server/services/ideas";
import { listCategories } from "@/server/services/taxonomy";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { SearchInput, FilterSelect, ClearFilters } from "@/components/shared/filter-bar";
import { IDEA_STAGES, PRIORITIES } from "@/lib/constants";
import { IdeasView } from "./ideas-view";
import { NewIdeaButton } from "./new-idea";
import { ViewToggle } from "./view-toggle";
import type { IdeaStage, Priority } from "@prisma/client";

export const metadata = { title: "Ideas" };

const SORTS: { value: IdeaSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "priority", label: "Highest priority" },
  { value: "score", label: "Evaluation score" },
  { value: "title", label: "Title A–Z" },
];

export default async function IdeasPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "list" || sp.view === "board" ? sp.view : "cards";

  const created = sp.created ? Number(sp.created) : undefined;
  const filter: IdeaFilter = {
    q: sp.q,
    stage: (IDEA_STAGES.some((s) => s.value === sp.stage) || sp.stage === "ALL" ? sp.stage : view === "board" ? "ALL" : "ACTIVE") as IdeaStage | "ALL" | "ACTIVE",
    categoryId: sp.category,
    tag: sp.tag,
    priority: PRIORITIES.some((p) => p.value === sp.priority) ? (sp.priority as Priority) : undefined,
    minScore: sp.score ? Number(sp.score) : undefined,
    createdAfter: created ? new Date(Date.now() - created * 86_400_000) : undefined,
    sort: (SORTS.some((s) => s.value === sp.sort) ? sp.sort : "updated") as IdeaSort,
  };
  const [ideas, categories, tags, total] = await Promise.all([
    listIdeas(user.id, filter),
    listCategories(user.id),
    db.tag.findMany({ where: { userId: user.id, ideas: { some: {} } }, select: { name: true }, orderBy: { name: "asc" } }),
    db.idea.count({ where: { userId: user.id, deletedAt: null } }),
  ]);
  const filterKeys = ["q", "stage", "category", "tag", "priority", "score", "created"];
  const filtered = filterKeys.some((k) => sp[k]);

  return (
    <div>
      <PageHeader
        title="Ideas"
        description="The vault. Explore freely — then evaluate honestly."
        actions={<><ViewToggle view={view} /><NewIdeaButton categories={categories} autoOpen={sp.new === "1"} /></>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search ideas" className="min-w-48 flex-1" />
        {view !== "board" && <FilterSelect param="stage" label="Active stages" options={[{ value: "ALL", label: "All stages" }, ...IDEA_STAGES]} />}
        {categories.length > 0 && <FilterSelect param="category" label="Any category" options={categories.map((c) => ({ value: c.id, label: c.name }))} />}
        {tags.length > 0 && <FilterSelect param="tag" label="Any tag" options={tags.map((t) => ({ value: t.name, label: `#${t.name}` }))} />}
        <FilterSelect param="priority" label="Any priority" options={PRIORITIES} />
        <FilterSelect param="score" label="Any score" options={[{ value: "75", label: "Score ≥ 75" }, { value: "58", label: "Score ≥ 58" }, { value: "40", label: "Score ≥ 40" }]} />
        <FilterSelect param="created" label="Any time" options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "365", label: "Last year" }]} />
        <FilterSelect param="sort" label="Recently updated" options={SORTS.slice(1)} />
        <ClearFilters keys={filterKeys} />
      </div>

      {ideas.length === 0 && view !== "board" ? (
        total === 0 ? (
          <EmptyState icon={Lightbulb} title="No ideas yet" action={<NewIdeaButton categories={categories} />}>
            Create one here, or convert a thought from your Inbox into an idea when it&apos;s worth exploring.
          </EmptyState>
        ) : (
          <EmptyState icon={Lightbulb} title={filtered ? "No ideas match these filters" : "No active ideas"}>
            {filtered ? "Try clearing a filter." : "Archived ideas live under Archive."}
          </EmptyState>
        )
      ) : (
        <IdeasView ideas={ideas} view={view} />
      )}
    </div>
  );
}
