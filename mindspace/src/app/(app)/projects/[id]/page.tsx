import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getProjectDetail } from "@/server/services/projects";
import { getRelated } from "@/server/services/links";
import { listReflections } from "@/server/services/reflections";
import { assertUuid, orNotFound } from "@/server/page-helpers";
import { ProjectWorkspace } from "./project-workspace";

export const metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  assertUuid(id);
  const project = await orNotFound(() => getProjectDetail(user.id, id));
  const [related, reflections] = await Promise.all([getRelated(user.id, "PROJECT", id), listReflections(user.id, { entityType: "PROJECT", entityId: id })]);
  return (
    <div>
      <Link href="/projects" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Projects
      </Link>
      <ProjectWorkspace project={project} related={related} reflections={reflections} />
    </div>
  );
}
