"use client";
import { LayoutGrid, List, Columns3 } from "lucide-react";
import { useQueryState } from "@/components/shared/filter-bar";
import { cn } from "@/lib/utils";

export function ViewToggle({ view }: { view: string }) {
  const { set } = useQueryState();
  const opts = [
    { v: "cards", icon: LayoutGrid, label: "Cards" },
    { v: "list", icon: List, label: "List" },
    { v: "board", icon: Columns3, label: "Board" },
  ];
  return (
    <div className="flex rounded-md border bg-card p-0.5" role="radiogroup" aria-label="View">
      {opts.map(({ v, icon: Icon, label }) => (
        <button key={v} role="radio" aria-checked={view === v} title={label} aria-label={label} onClick={() => set({ view: v === "cards" ? null : v })}
          className={cn("rounded px-2 py-1.5 text-muted-foreground hover:text-foreground", view === v && "bg-muted text-foreground")}>
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
