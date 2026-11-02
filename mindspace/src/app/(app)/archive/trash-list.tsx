"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Trash2, X } from "lucide-react";
import { deleteForever, emptyTrash, restoreItem } from "@/server/actions/misc";
import { ENTITY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { TimeAgo } from "@/components/shared/item-link";
import type { EntityType } from "@prisma/client";

type Item = { type: EntityType; id: string; title: string; deletedAt: Date };

export function TrashList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [confirm, setConfirm] = useState<Item | "all" | null>(null);
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(msg);
      router.refresh();
    });

  if (items.length === 0) return <EmptyState icon={Trash2} title="Trash is empty">Deleted items wait here until you remove them for good.</EmptyState>;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirm("all")}><Trash2 /> Empty trash</Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {items.map((i) => (
          <li key={`${i.type}${i.id}`} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{i.title}</div>
              <div className="text-xs text-muted-foreground">{ENTITY_LABELS[i.type]} · deleted <TimeAgo date={i.deletedAt} /></div>
            </div>
            <Button variant="outline" size="xs" onClick={() => act(() => restoreItem(i.type, i.id), "Restored")}><RotateCcw /> Restore</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setConfirm(i)} aria-label={`Delete ${i.title} permanently`}><X /></Button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm === "all" ? "Empty the trash?" : "Delete permanently?"}
        description={confirm === "all" ? `All ${items.length} items will be permanently deleted, including their notes, evaluations and history. This can't be undone.` : "This item and everything attached to it will be permanently deleted. This can't be undone."}
        confirmLabel="Delete permanently"
        destructive
        onConfirm={() => {
          if (confirm === "all") act(() => emptyTrash(), "Trash emptied");
          else if (confirm) act(() => deleteForever(confirm.type, confirm.id), "Deleted permanently");
        }}
      />
    </div>
  );
}
