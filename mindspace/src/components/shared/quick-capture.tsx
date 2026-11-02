"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowUp } from "lucide-react";
import { captureThought } from "@/server/actions/thoughts";
import { THOUGHT_TYPES } from "@/lib/constants";
import { TagInput } from "./tag-input";
import { Kbd } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ThoughtType } from "@prisma/client";

/**
 * The fastest path from a thought to the Inbox. Type and tags are optional —
 * a thought can stay unclassified forever.
 */
export function QuickCapture({ autoFocus, onCaptured, variant = "inline", tagSuggestions = [] }: {
  autoFocus?: boolean; onCaptured?: () => void; variant?: "inline" | "dialog"; tagSuggestions?: string[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [type, setType] = useState<ThoughtType | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const expanded = variant === "dialog" || focused || content.length > 0;

  const submit = () => {
    if (!content.trim() || pending) return;
    start(async () => {
      const res = await captureThought({ content, type, tags });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setContent("");
      setType(null);
      setTags([]);
      toast.success("Captured to Inbox", { action: { label: "View", onClick: () => router.push("/inbox") } });
      router.refresh();
      onCaptured?.();
      ref.current?.focus();
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-shadow",
        variant === "inline" && "shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] focus-within:border-ring/40",
        variant === "dialog" && "border-0 bg-transparent",
      )}
    >
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 420)}px`;
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={variant === "dialog" ? 4 : 2}
        placeholder="What's on your mind?"
        aria-label="Capture a thought"
        className={cn(
          "block w-full resize-none bg-transparent font-serif text-lg leading-relaxed outline-none placeholder:text-muted-foreground/60",
          variant === "inline" ? "px-5 pt-4 pb-2" : "px-1 pt-1",
        )}
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={cn("flex flex-col gap-2 pb-3", variant === "inline" ? "px-4" : "px-0 pt-2")} onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}>
              <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Thought type (optional)">
                {THOUGHT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={type === t.value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setType(type === t.value ? null : t.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
                      type === t.value && "border-primary/40 bg-accent text-accent-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} className="flex-1" placeholder="Tags (optional)" />
                <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                  <Kbd>⌘</Kbd>
                  <Kbd>↵</Kbd>
                </span>
                <Button size="icon-sm" onMouseDown={(e) => e.preventDefault()} onClick={submit} disabled={!content.trim()} loading={pending} aria-label="Save thought">
                  {!pending && <ArrowUp />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
