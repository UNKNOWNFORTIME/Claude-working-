import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getGoalDetail } from "@/server/services/goals";
import { getRelated } from "@/server/services/links";
import { listReflections } from "@/server/services/reflections";
import { assertUuid, orNotFound } from "@/server/page-helpers";
import { GoalWorkspace } from "./goal-workspace";

export const metadata = { title: "Goal" };

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  assertUuid(id);
  const goal = await orNotFound(() => getGoalDetail(user.id, id));
  const [related, reflections] = await Promise.all([getRelated(user.id, "GOAL", id), listReflections(user.id, { entityType: "GOAL", entityId: id })]);
  return (
    <div>
      <Link href="/goals" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Goals
      </Link>
      <GoalWorkspace goal={goal} related={related} reflections={reflections} />
    </div>
  );
}
