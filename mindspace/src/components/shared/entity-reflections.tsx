"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { saveReflection, deleteReflection } from "@/server/actions/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "./markdown";
import { formatDate } from "@/lib/utils";
import type { EntityType } from "@prisma/client";

type R = { id: string; content: string; createdAt: Date };

/** Reflections attached to a project or goal — what worked, what I learned. */
export function EntityReflections({ entityType, entityId, reflections, prompt, path }: { entityType: EntityType; entityId: string; reflections: R[]; prompt: string; path: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const kind = entityType === "PROJECT" ? "PROJECT" : entityType === "GOAL" ? "GOAL" : "IDEA";
  return (
    <div className="space-y-4">
      <div>
        <Textarea autoGrow rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={prompt} aria-label="New reflection" />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={!text.trim()}
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await saveReflection(null, { kind, content: text, entityType, entityId });
                if (!r.ok) return void toast.error(r.error);
                setText("");
                router.refresh();
              })
            }
          >
            Save reflection
          </Button>
        </div>
      </div>
      {reflections.map((r) => (
        <div key={r.id} className="group rounded-lg border-l-2 border-primary/30 bg-muted/30 px-4 py-3">
          <div className="mb-1 flex items-center text-xs text-muted-foreground">
            {formatDate(r.createdAt)}
            <button
              onClick={() => start(async () => { const res = await deleteReflection(r.id, path); if (!res.ok) toast.error(res.error); router.refresh(); })}
              className="ml-auto rounded p-0.5 opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
              aria-label="Delete reflection"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <Markdown className="text-sm">{r.content}</Markdown>
        </div>
      ))}
    </div>
  );
}
