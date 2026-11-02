"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children, title, description, hideClose, ...props }: React.ComponentProps<typeof D.Content> & { title: string; description?: string; hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border bg-popover p-5 shadow-2xl shadow-black/10 focus:outline-none",
          "data-[state=open]:animate-[dialog-in_160ms_ease-out]",
          className,
        )}
        {...props}
      >
        <D.Title className={cn("text-base font-semibold tracking-tight", hideClose && "sr-only")}>{title}</D.Title>
        {description ? <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
        <div className={cn(!hideClose && "mt-4")}>{children}</div>
        {!hideClose && (
          <D.Close className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

/** Small confirm dialog driven by a promise-free callback. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; confirmLabel?: string; destructive?: boolean; onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} className="max-w-sm">
        <div className="flex justify-end gap-2">
          <button className="h-8 rounded-md px-3 text-sm hover:bg-muted" onClick={() => onOpenChange(false)}>Cancel</button>
          <button
            disabled={busy}
            className={cn("h-8 rounded-md px-3 text-sm font-medium text-white disabled:opacity-60", destructive ? "bg-destructive" : "bg-primary text-primary-foreground")}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
