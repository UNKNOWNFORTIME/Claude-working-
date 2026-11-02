"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveReflection } from "@/server/actions/misc";
import { useAutosave } from "@/hooks/use-autosave";
import { WEEKLY_PROMPTS } from "@/lib/constants";
import { Textarea } from "@/components/ui/input";
import { SaveIndicator } from "@/components/shared/save-indicator";
import { formatDate } from "@/lib/utils";

const shift = (iso: string, days: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function WeeklyReflection({ weekOf, isCurrent, existing, pastWeeks }: {
  weekOf: string; isCurrent: boolean; existing: { id: string; answers: Record<string, string>; content: string } | null; pastWeeks: { id: string; weekOf: string }[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(existing?.answers ?? {});
  const [content, setContent] = useState(existing?.content ?? "");
  const idRef = useRef<string | null>(existing?.id ?? null);
  const latest = useRef({ answers, content });
  latest.current = { answers, content };

  // Saves the whole reflection each time (it's small), creating it on first save.
  const autosave = useAutosave<{ touched: boolean }>(async () => {
    const res = await saveReflection(idRef.current, { kind: "WEEKLY", title: `Week of ${formatDate(weekOf + "T12:00:00")}`, weekOf, ...latest.current });
    if (res.ok) idRef.current = res.data.id;
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }, 900);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_12rem]">
      <div>
        <div className="mb-6 flex items-center gap-2">
          <Link href={`/reflections?week=${shift(weekOf, -7)}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Previous week"><ChevronLeft className="size-4" /></Link>
          <h2 className="font-serif text-xl">Week of {formatDate(weekOf + "T12:00:00", { month: "long", day: "numeric", year: "numeric" })}</h2>
          {!isCurrent && <Link href={`/reflections?week=${shift(weekOf, 7)}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Next week"><ChevronRight className="size-4" /></Link>}
          <SaveIndicator state={autosave.state} error={autosave.error} className="ml-auto" />
        </div>
        <p className="mb-6 text-sm text-muted-foreground">Answer any prompts that feel useful — or none. Write freely below.</p>
        <div className="space-y-6">
          {WEEKLY_PROMPTS.map((p) => (
            <div key={p.id}>
              <label htmlFor={`wp-${p.id}`} className="mb-1.5 block font-serif text-[17px] text-foreground/90">{p.text}</label>
              <Textarea id={`wp-${p.id}`} autoGrow rows={2} value={answers[p.id] ?? ""} onChange={(e) => { setAnswers((a) => ({ ...a, [p.id]: e.target.value })); autosave.queue({ touched: true }); }} onBlur={() => autosave.flush()} />
            </div>
          ))}
          <div>
            <label htmlFor="wp-free" className="mb-1.5 block font-serif text-[17px] text-foreground/90">Anything else</label>
            <Textarea id="wp-free" autoGrow rows={4} value={content} onChange={(e) => { setContent(e.target.value); autosave.queue({ touched: true }); }} onBlur={() => autosave.flush()} />
          </div>
        </div>
      </div>
      <aside>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Past weeks</div>
        {pastWeeks.length === 0 ? <p className="text-xs text-muted-foreground">None yet.</p> : (
          <ul className="space-y-0.5">
            {pastWeeks.map((w) => (
              <li key={w.id}>
                <Link href={`/reflections?week=${w.weekOf}`} className={`block rounded px-2 py-1 text-sm hover:bg-muted ${w.weekOf === weekOf ? "bg-muted font-medium" : "text-muted-foreground"}`}>
                  {formatDate(w.weekOf + "T12:00:00", { month: "short", day: "numeric", year: "numeric" })}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
