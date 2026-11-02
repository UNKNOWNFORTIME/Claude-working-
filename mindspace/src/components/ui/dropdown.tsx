"use client";
import * as React from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;

export function DropdownMenuContent({ className, align = "end", ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl shadow-black/5 data-[state=open]:animate-[menu-in_120ms_ease-out]", className)}
        {...props}
      />
    </M.Portal>
  );
}
export function DropdownMenuItem({ className, destructive, ...props }: React.ComponentProps<typeof M.Item> & { destructive?: boolean }) {
  return (
    <M.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground",
        destructive && "text-destructive [&_svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuSeparator() {
  return <M.Separator className="my-1 h-px bg-border" />;
}
export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground", className)} {...props} />;
}
