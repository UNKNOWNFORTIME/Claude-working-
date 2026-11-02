"use client";
import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { updateTask } from "@/server/actions/projects";
import { cn } from "@/lib/utils";

export function TaskCheckbox({ id, done, projectId, label }: { id: string; done: boolean; projectId?: string; label?: string }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, start] = useTransition();
  return (
    <button
      role="checkbox"
      aria-checked={optimistic}
      aria-label={label ? `Mark “${label}” ${optimistic ? "not done" : "done"}` : "Toggle done"}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const res = await updateTask(id, { done: !optimistic }, projectId);
          if (!res.ok) toast.error(res.error);
          router.refresh();
        })
      }
      className={cn(
        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
        optimistic ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary",
      )}
    >
      {optimistic && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}
