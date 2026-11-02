"use client";
import { useState } from "react";
import { TagChip } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, 40);

export function TagInput({ value, onChange, suggestions = [], placeholder = "Add tag…", className }: {
  value: string[]; onChange: (tags: string[]) => void; suggestions?: string[]; placeholder?: string; className?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const t = norm(raw);
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  const matches = draft ? suggestions.filter((s) => s.includes(norm(draft)) && !value.includes(s)).slice(0, 5) : [];
  return (
    <div className={cn("relative", className)}>
      <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-transparent px-1 py-0.5 hover:border-border focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        {value.map((t) => (
          <TagChip key={t} name={t} onRemove={() => onChange(value.filter((x) => x !== t))} />
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === "," || e.key === " ") && draft.trim()) {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? "" : placeholder}
          aria-label="Add tag"
          className="h-6 min-w-20 flex-1 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {matches.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 rounded-md border bg-popover p-1 shadow-lg">
          {matches.map((m) => (
            <button key={m} type="button" onMouseDown={(e) => { e.preventDefault(); add(m); }} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted">
              #{m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
