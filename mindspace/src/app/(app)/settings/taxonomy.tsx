"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { createCategory, deleteCategory, deleteTag, updateCategory } from "@/server/actions/misc";
import { CATEGORY_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dot, DOT_TONES } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CategoriesSection({ categories }: { categories: { id: string; name: string; color: string; count: number }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("slate");
  const [, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => { const r = await fn(); if (!r.ok) return void toast.error(r.error); after?.(); router.refresh(); });

  return (
    <div className="space-y-3">
      {categories.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2">
              <ColorPicker value={c.color} onChange={(col) => act(() => updateCategory(c.id, { name: c.name, color: col }))} />
              <input
                defaultValue={c.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && act(() => updateCategory(c.id, { name: e.target.value, color: c.color }))}
                className="flex-1 bg-transparent text-sm outline-none"
                aria-label="Category name"
              />
              <span className="text-xs text-muted-foreground">{c.count} ideas</span>
              <button onClick={() => act(() => deleteCategory(c.id))} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label={`Delete category ${c.name}`}><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) act(() => createCategory({ name, color }), () => setName("")); }}>
        <ColorPicker value={color} onChange={setColor} />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category, e.g. Business, Learning, Creative" className="max-w-sm" aria-label="New category name" />
        <Button variant="outline" size="icon" disabled={!name.trim()} aria-label="Add category"><Plus /></Button>
      </form>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="flex size-6 items-center justify-center rounded hover:bg-muted" aria-label="Choose colour"><Dot tone={value} className="size-3" /></button>
      {open && (
        <div className="absolute left-0 top-7 z-20 flex gap-1 rounded-md border bg-popover p-1.5 shadow-lg">
          {CATEGORY_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }} className={cn("size-5 rounded-full ring-offset-2 ring-offset-popover", DOT_TONES[c], value === c && "ring-2 ring-ring")} aria-label={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TagsSection({ tags }: { tags: { id: string; name: string; count: number }[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  if (!tags.length) return <p className="text-sm text-muted-foreground">No tags yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
          #{t.name} <span className="text-muted-foreground">{t.count}</span>
          <button onClick={() => start(async () => { const r = await deleteTag(t.id); if (!r.ok) toast.error(r.error); router.refresh(); })} className="ml-0.5 text-muted-foreground hover:text-destructive" aria-label={`Delete tag ${t.name}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
