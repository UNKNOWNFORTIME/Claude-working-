"use client";
import { useState } from "react";
import { Eye, PenLine } from "lucide-react";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";

/** Plain textarea with a preview toggle. Markdown stays plain text — nothing is lost. */
export function MarkdownEditor({ value, onChange, onBlur, placeholder, minRows = 6, className, label }: {
  value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; minRows?: number; className?: string; label?: string;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div className={cn("group relative", className)}>
      <div className="absolute right-2 top-2 z-10 flex rounded-md border bg-card p-0.5 opacity-0 shadow-xs transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" onClick={() => setPreview(false)} className={cn("rounded px-1.5 py-1 text-muted-foreground", !preview && "bg-muted text-foreground")} aria-label="Write" aria-pressed={!preview}>
          <PenLine className="size-3.5" />
        </button>
        <button type="button" onClick={() => setPreview(true)} className={cn("rounded px-1.5 py-1 text-muted-foreground", preview && "bg-muted text-foreground")} aria-label="Preview" aria-pressed={preview}>
          <Eye className="size-3.5" />
        </button>
      </div>
      {preview ? (
        <div className="min-h-24 rounded-md border border-transparent px-3 py-2" onDoubleClick={() => setPreview(false)}>
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-muted-foreground">Nothing written yet.</p>}
        </div>
      ) : (
        <Textarea
          autoGrow
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={minRows}
          className="border-transparent bg-transparent px-3 shadow-none hover:border-border focus-visible:bg-card text-[15px]"
        />
      )}
    </div>
  );
}
