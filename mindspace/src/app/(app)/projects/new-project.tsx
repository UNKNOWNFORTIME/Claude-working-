"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createProject } from "@/server/actions/projects";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

export function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}><Plus /> New project</Button>
      <DialogContent title="New project" description="Projects work best with a clear objective and a small first milestone.">
        <form
          className="space-y-4"
          action={(fd) =>
            start(async () => {
              const res = await createProject({ name: fd.get("name"), objective: fd.get("objective"), deadline: fd.get("deadline") || null, status: "ACTIVE" });
              if (!res.ok) return void toast.error(res.error);
              setOpen(false);
              router.push(`/projects/${res.data.id}`);
            })
          }
        >
          <Field label="Name" htmlFor="p-name"><Input id="p-name" name="name" required autoFocus maxLength={200} /></Field>
          <Field label="Objective" htmlFor="p-obj"><Textarea id="p-obj" name="objective" rows={2} placeholder="What does done look like?" /></Field>
          <Field label="Deadline (optional)" htmlFor="p-deadline"><Input id="p-deadline" name="deadline" type="date" /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending}>Create project</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
