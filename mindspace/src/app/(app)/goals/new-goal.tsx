"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createGoal } from "@/server/actions/goals";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { GOAL_KINDS } from "@/lib/constants";

export function NewGoalButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}><Plus /> New goal</Button>
      <DialogContent title="New goal">
        <form
          className="space-y-4"
          action={(fd) =>
            start(async () => {
              const res = await createGoal({ title: fd.get("title"), kind: fd.get("kind"), whyItMatters: fd.get("why"), targetDate: fd.get("targetDate") || null });
              if (!res.ok) return void toast.error(res.error);
              setOpen(false);
              router.push(`/goals/${res.data.id}`);
            })
          }
        >
          <Field label="Goal" htmlFor="g-title"><Input id="g-title" name="title" required autoFocus maxLength={200} placeholder="e.g. Build a technical art portfolio" /></Field>
          <Field label="Why it matters" htmlFor="g-why"><Textarea id="g-why" name="why" rows={3} placeholder="What changes for you when you get there?" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind" htmlFor="g-kind">
              <Select id="g-kind" name="kind" defaultValue="PERSONAL" className="w-full">
                {GOAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </Select>
            </Field>
            <Field label="Target date (optional)" htmlFor="g-date"><Input id="g-date" name="targetDate" type="date" /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending}>Create goal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
