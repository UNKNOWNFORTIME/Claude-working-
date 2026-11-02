"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createIdea } from "@/server/actions/ideas";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PRIORITIES } from "@/lib/constants";

export function NewIdeaButton({ categories, autoOpen }: { categories: { id: string; name: string }[]; autoOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}><Plus /> New idea</Button>
      <DialogContent title="New idea" description="Start with a title. Everything else can come later.">
        <form
          className="space-y-4"
          action={(fd) =>
            start(async () => {
              const res = await createIdea({
                title: String(fd.get("title") ?? ""),
                summary: String(fd.get("summary") ?? ""),
                categoryId: (fd.get("categoryId") as string) || null,
                priority: String(fd.get("priority") ?? "MEDIUM"),
              });
              if (!res.ok) return setError(res.error);
              setOpen(false);
              toast.success("Idea created");
              router.push(`/ideas/${res.data.id}`);
            })
          }
        >
          <Field label="Title" htmlFor="idea-title">
            <Input id="idea-title" name="title" required maxLength={200} autoFocus placeholder="e.g. Digital heritage walks for Nigerian cities" />
          </Field>
          <Field label="One-line summary" htmlFor="idea-summary">
            <Textarea id="idea-summary" name="summary" rows={2} maxLength={500} placeholder="What is it, in a sentence?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="idea-cat">
              <Select id="idea-cat" name="categoryId" className="w-full" defaultValue="">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="idea-priority">
              <Select id="idea-priority" name="priority" className="w-full" defaultValue="MEDIUM">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending}>Create idea</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
