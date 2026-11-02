"use client";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { importBackup } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";

export function DataSection() {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><a href="/api/export?format=json" download><Download /> Export JSON (full backup)</a></Button>
        <Button asChild variant="outline" size="sm"><a href="/api/export?format=md" download><Download /> Export Markdown</a></Button>
      </div>
      <div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            start(async () => {
              const text = await f.text();
              const r = await importBackup(text);
              if (file.current) file.current.value = "";
              if (!r.ok) return void toast.error(r.error);
              const total = Object.values(r.data).reduce((a, b) => a + b, 0);
              toast.success(total ? `Imported ${r.data.ideas ?? 0} ideas, ${r.data.thoughts ?? 0} thoughts and ${total - (r.data.ideas ?? 0) - (r.data.thoughts ?? 0)} other records` : "Nothing new to import — everything in that file already exists.");
              router.refresh();
            });
          }}
        />
        <Button variant="outline" size="sm" onClick={() => file.current?.click()} loading={pending}><Upload /> Import from JSON export</Button>
        <p className="mt-2 text-xs text-muted-foreground">Merges a previous Mindspace JSON export into your account. Existing items are never overwritten, so importing the same file twice is safe.</p>
      </div>
      <p className="text-xs text-muted-foreground">For full database backups, run <code className="rounded bg-muted px-1">npm run backup</code> on the server (see README).</p>
    </div>
  );
}
