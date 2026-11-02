"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Scale } from "lucide-react";
import { startEvaluation } from "@/server/actions/evaluations";
import { Button } from "@/components/ui/button";

export function StartEvaluation({ ideaId, hasPrevious }: { ideaId: string; hasPrevious: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (copy: boolean) =>
    start(async () => {
      const res = await startEvaluation(ideaId, copy);
      if (!res.ok) return void toast.error(res.error);
      router.push(`/ideas/${ideaId}/evaluations/${res.data.id}`);
    });
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      <Button size="lg" onClick={() => go(false)} loading={pending}><Scale /> Start {hasPrevious ? "a fresh" : "the"} evaluation</Button>
      {hasPrevious && <Button size="lg" variant="outline" onClick={() => go(true)} disabled={pending}><Copy /> Start from previous answers</Button>}
    </div>
  );
}
