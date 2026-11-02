"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteReflection, saveReflection } from "@/server/actions/misc";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/shared/markdown";
import { formatDate, cn } from "@/lib/utils";

export function Journal({ entries, highlight }: { entries: { id: string; title: string; content: string; createdAt: Date }[]; highlight?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="border-0 px-0 font-serif text-lg shadow-none focus-visible:ring-0" aria-label="Reflection title" />
        <Textarea autoGrow rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Reflect on anything — a decision, a pattern, how you're spending your time…" className="border-0 px-0 shadow-none focus-visible:ring-0" aria-label="Reflection" />
        <div className="flex justify-end">
          <Button size="sm" disabled={!content.trim()} loading={pending} onClick={() => start(async () => {
            const r = await saveReflection(null, { kind: "GENERAL", title, content });
            if (!r.ok) return void toast.error(r.error);
            setTitle(""); setContent(""); router.refresh();
          })}>Save</Button>
        </div>
      </div>
      {entries.map((e) => (
        <article key={e.id} className={cn("group rounded-xl border-l-2 border-primary/30 bg-muted/20 px-5 py-4", highlight === e.id && "ring-2 ring-ring/30")}>
          <header className="mb-2 flex items-baseline gap-3">
            {e.title && <h3 className="font-serif text-lg">{e.title}</h3>}
            <span className="text-xs text-muted-foreground">{formatDate(e.createdAt)}</span>
            <button onClick={() => start(async () => { const r = await deleteReflection(e.id); if (!r.ok) toast.error(r.error); router.refresh(); })} className="ml-auto rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100" aria-label="Delete reflection">
              <Trash2 className="size-3.5" />
            </button>
          </header>
          <Markdown className="text-sm">{e.content}</Markdown>
        </article>
      ))}
    </div>
  );
}
