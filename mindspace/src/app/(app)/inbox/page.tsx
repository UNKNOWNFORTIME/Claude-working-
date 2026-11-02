import { Inbox } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listThoughts } from "@/server/services/thoughts";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { QuickCapture } from "@/components/shared/quick-capture";
import { SearchInput, FilterSelect, ClearFilters } from "@/components/shared/filter-bar";
import { THOUGHT_TYPES } from "@/lib/constants";
import { ThoughtList } from "./thought-list";
import type { ThoughtStatus, ThoughtType } from "@prisma/client";

export const metadata = { title: "Inbox" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = (["INBOX", "PROCESSED", "ARCHIVED", "ALL"].includes(sp.status ?? "") ? sp.status : "INBOX") as ThoughtStatus | "ALL";
  const type = THOUGHT_TYPES.some((t) => t.value === sp.type) || sp.type === "UNCLASSIFIED" ? (sp.type as ThoughtType | "UNCLASSIFIED") : undefined;
  const [thoughts, tags] = await Promise.all([
    listThoughts(user.id, { status, type, tag: sp.tag, q: sp.q }),
    db.tag.findMany({ where: { userId: user.id }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const filtered = !!(sp.q || sp.type || sp.tag || (sp.status && sp.status !== "INBOX"));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Inbox" description="Everything you've captured. No need to decide where it belongs yet." />
      <QuickCapture tagSuggestions={tags.map((t) => t.name)} />

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search thoughts" className="min-w-48 flex-1" />
        <FilterSelect param="status" label="In inbox" options={[{ value: "PROCESSED", label: "Processed" }, { value: "ARCHIVED", label: "Archived" }, { value: "ALL", label: "All thoughts" }]} />
        <FilterSelect param="type" label="Any type" options={[...THOUGHT_TYPES, { value: "UNCLASSIFIED", label: "Unclassified" }]} />
        {tags.length > 0 && <FilterSelect param="tag" label="Any tag" options={tags.map((t) => ({ value: t.name, label: `#${t.name}` }))} />}
        <ClearFilters keys={["q", "status", "type", "tag"]} />
      </div>

      <div className="mt-4">
        {thoughts.length === 0 ? (
          <EmptyState icon={Inbox} title={filtered ? "No matching thoughts" : "Inbox zero"} className="mt-6">
            {filtered ? "Try a different filter." : "A clear mind. When something comes up, capture it above or press C anywhere."}
          </EmptyState>
        ) : (
          <ThoughtList thoughts={thoughts} highlight={sp.thought} tagSuggestions={tags.map((t) => t.name)} />
        )}
      </div>
    </div>
  );
}
