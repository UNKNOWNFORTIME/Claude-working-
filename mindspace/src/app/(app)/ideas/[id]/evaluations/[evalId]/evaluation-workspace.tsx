"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Info, Sparkles, Trash2 } from "lucide-react";
import { completeEvaluation, deleteEvaluation, saveEvaluation } from "@/server/actions/evaluations";
import { runAIAction } from "@/server/actions/ai";
import { useDeviceAI } from "@/hooks/use-device-ai";
import { useAutosave } from "@/hooks/use-autosave";
import { EVALUATION_SECTIONS, RISK_QUESTION_IDS, countAnswered } from "@/lib/evaluation-questions";
import { BAND_COPY, CRITERIA, computeScore, scoreBand, scoreInsights, type CriterionKey, type Scores, type Weights } from "@/lib/scoring";
import { outcomeLabel, outcomeTone } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/dialog";
import { SaveIndicator } from "@/components/shared/save-indicator";
import { DecisionDialog } from "@/components/shared/decision-dialog";
import type { DecisionOutcome } from "@prisma/client";

type EvalView = {
  id: string; ideaId: string; ideaTitle: string; ideaSummary: string; answers: Record<string, string>; scores: Scores; uncertainties: string;
  completedAt: Date | null; createdAt: Date; decisions: { id: string; outcome: DecisionOutcome; rationale: string; decidedAt: Date }[];
};
type Patch = { answers: Record<string, string>; scores: Record<string, number | null>; uncertainties: string };

const BAND_STYLE = {
  strong: "text-emerald-600 dark:text-emerald-400",
  promising: "text-sky-600 dark:text-sky-400",
  mixed: "text-amber-600 dark:text-amber-400",
  weak: "text-rose-600 dark:text-rose-400",
};

export function EvaluationWorkspace({ evaluation, weights, weightsAreSnapshot, previous, aiReady }: {
  evaluation: EvalView; weights: Weights; weightsAreSnapshot: boolean;
  previous: { createdAt: Date; overallScore: number | null; scores: Scores } | null; aiReady: boolean;
}) {
  const router = useRouter();
  const device = useDeviceAI();
  const [answers, setAnswers] = useState(evaluation.answers);
  const [scores, setScores] = useState<Scores>(evaluation.scores);
  const [uncertainties, setUncertainties] = useState(evaluation.uncertainties);
  const [openSection, setOpenSection] = useState<string | null>(EVALUATION_SECTIONS[0].id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const [critiquing, setCritiquing] = useState(false);

  // Answers and scores are merged per-key (here and on the server), so only changed keys are sent.
  const autosave = useAutosave<Patch>(
    async (patch) => {
      const res = await saveEvaluation(evaluation.id, patch);
      return res.ok ? { ok: true } : { ok: false, error: res.error };
    },
    700,
    (a, b) => ({
      ...a,
      ...b,
      answers: a.answers || b.answers ? { ...a.answers, ...b.answers } : undefined,
      scores: a.scores || b.scores ? { ...a.scores, ...b.scores } : undefined,
    }),
  );
  const setAnswer = (id: string, v: string) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    autosave.queue({ answers: { [id]: v } });
  };
  const setScore = (k: CriterionKey, v: number | null) => {
    setScores((s) => ({ ...s, [k]: v }));
    autosave.queue({ scores: { [k]: v } });
  };

  const result = computeScore(scores, weights);
  const insights = scoreInsights(result, { risksWritten: countAnswered(answers, RISK_QUESTION_IDS) > 0, hasUncertainties: result.complete ? uncertainties.trim().length > 0 : undefined });
  const band = result.overall != null ? scoreBand(result.overall) : null;
  const answeredTotal = countAnswered(answers);

  const complete = () =>
    start(async () => {
      await autosave.flush();
      const res = await completeEvaluation(evaluation.ideaId, evaluation.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Evaluation saved. Now — what do you decide?");
      router.refresh();
    });

  const critique = () => {
    if (device.active) {
      // On-device models stream their answer in the Thinking partner tab
      void autosave.flush().then(() => router.push(`/ideas/${evaluation.ideaId}?tab=ai&run=critique`));
      return;
    }
    setCritiquing(true);
    start(async () => {
      await autosave.flush();
      const res = await runAIAction(evaluation.ideaId, "critique");
      setCritiquing(false);
      if (!res.ok) return void toast.error(res.error);
      router.push(`/ideas/${evaluation.ideaId}?tab=ai&c=${res.data.id}`);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Evaluation</h1>
          {evaluation.completedAt ? <Badge tone="emerald"><Check className="size-3" /> Completed {formatDate(evaluation.completedAt)}</Badge> : <Badge tone="amber">Draft</Badge>}
          <SaveIndicator state={autosave.state} error={autosave.error} className="ml-auto" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Started {formatDate(evaluation.createdAt)} · {answeredTotal} questions answered · Answer what&apos;s useful, skip what isn&apos;t.
        </p>

        {/* Questions */}
        <div className="mt-8 space-y-2">
          {EVALUATION_SECTIONS.map((section) => {
            const answered = countAnswered(answers, section.questions.map((q) => q.id));
            const open = openSection === section.id;
            return (
              <section key={section.id} className="rounded-xl border bg-card">
                <button onClick={() => setOpenSection(open ? null : section.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left" aria-expanded={open}>
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold", answered === section.questions.length ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {answered === section.questions.length ? <Check className="size-3.5" /> : section.letter}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{section.title}</span>
                    <span className="block text-xs text-muted-foreground">{section.description}</span>
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{answered}/{section.questions.length}</span>
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                </button>
                {open && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 border-t px-4 py-5">
                    {section.questions.map((q) => (
                      <div key={q.id}>
                        <label htmlFor={q.id} className="mb-1.5 block text-sm font-medium text-foreground/85">{q.text}</label>
                        <Textarea id={q.id} autoGrow rows={2} value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} onBlur={() => autosave.flush()} className="text-[14.5px]" />
                      </div>
                    ))}
                    {(() => {
                      const idx = EVALUATION_SECTIONS.findIndex((s) => s.id === section.id);
                      const next = EVALUATION_SECTIONS[idx + 1];
                      return next ? (
                        <div className="flex justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setOpenSection(next.id)}>Next: {next.title} →</Button>
                        </div>
                      ) : (
                        <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => { setOpenSection(null); document.getElementById("scoring")?.scrollIntoView({ behavior: "smooth" }); }}>Continue to scoring →</Button></div>
                      );
                    })()}
                  </motion.div>
                )}
              </section>
            );
          })}
        </div>

        {/* Scoring */}
        <section id="scoring" className="mt-12 scroll-mt-8">
          <h2 className="font-serif text-2xl">Scores</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            1 = very poor, 10 = excellent. Leave a criterion unscored if you genuinely don&apos;t know yet.
            {previous && <> Faint markers show your previous evaluation ({formatDate(previous.createdAt)}).</>}
          </p>
          <div className="mt-6 space-y-6">
            {CRITERIA.map((c) => {
              const v = scores[c.key] ?? null;
              const prev = previous?.scores[c.key] ?? null;
              return (
                <div key={c.key}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-xs text-muted-foreground">{c.hint}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span title="Weight">×{weights[c.key]}</span>
                      {v != null && <button onClick={() => setScore(c.key, null)} className="hover:text-foreground" aria-label={`Clear ${c.label} score`}>clear</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={c.label}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        role="radio"
                        aria-checked={v === n}
                        aria-label={`${n}`}
                        onClick={() => setScore(c.key, n)}
                        className={cn(
                          "relative h-9 rounded-md border text-sm tabular-nums transition-all hover:border-ring/40",
                          v != null && n <= v ? "border-primary/30 bg-primary/10 text-foreground" : "bg-card text-muted-foreground",
                          v === n && "border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary",
                        )}
                      >
                        {n}
                        {prev === n && v !== n && <span className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-muted-foreground/60" aria-hidden />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            <label htmlFor="uncertainties" className="text-sm font-medium">What am I unsure about?</label>
            <p className="mb-2 text-xs text-muted-foreground">Assumptions that, if wrong, would change these scores. This sits next to the score so the number is never read alone.</p>
            <Textarea id="uncertainties" autoGrow rows={3} value={uncertainties} onChange={(e) => { setUncertainties(e.target.value); autosave.queue({ uncertainties: e.target.value }); }} onBlur={() => autosave.flush()} />
          </div>
        </section>
      </div>

      {/* Result panel */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-xl border bg-card p-5">
          <SectionLabel>Overall</SectionLabel>
          <div className="mt-2 flex items-baseline gap-2">
            <motion.span key={result.overall ?? "none"} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cn("font-serif text-5xl tabular-nums", band && BAND_STYLE[band])}>
              {result.overall != null ? Math.round(result.overall) : "—"}
            </motion.span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            {previous?.overallScore != null && result.overall != null && (
              <span className="ml-auto text-xs text-muted-foreground" title="Change since previous evaluation">
                {result.overall - previous.overallScore >= 0 ? "+" : ""}{Math.round(result.overall - previous.overallScore)} vs previous
              </span>
            )}
          </div>
          {band ? (
            <>
              <div className={cn("mt-1 text-sm font-medium", BAND_STYLE[band])}>{BAND_COPY[band].label}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{BAND_COPY[band].text}</p>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Score at least one criterion to see a result.</p>
          )}

          {result.scoredCount > 0 && (
            <div className="mt-5 space-y-2">
              {result.breakdown.map((b) => (
                <div key={b.key} className="text-xs">
                  <div className="flex justify-between gap-2">
                    <span className={cn(b.score == null && "text-muted-foreground")}>{b.label}</span>
                    <span className="tabular-nums text-muted-foreground" title={`Score ${b.score ?? "—"}/10 × weight ${b.weight} → ${b.points} of a possible ${b.maxPoints} points`}>{b.score == null ? "not scored" : `${b.points} of ${b.maxPoints} pts`}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary/80 transition-[width] duration-300" style={{ width: `${(b.score ?? 0) * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none hover:text-foreground">How is this calculated?</summary>
            <div className="mt-2 space-y-1.5 leading-relaxed">
              <p>Each scored criterion contributes <em>score × weight</em>. The total is divided by the maximum possible (10 × the sum of weights) and scaled to 100.</p>
              <p>Each row shows the points a criterion contributes out of the most it could (its share of the total weight). Bars show the raw 1–10 score.</p>
              <p>Unscored criteria are left out rather than counted as zero.</p>
              <p>{weightsAreSnapshot ? "This evaluation keeps the weights it was completed with, so it stays comparable over time." : <>Weights come from <Link href="/settings#weights" className="text-primary hover:underline">Settings</Link> and are saved with the evaluation.</>}</p>
            </div>
          </details>

          {insights.length > 0 && (
            <ul className="mt-5 space-y-2 border-t pt-4">
              {insights.map((ins, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed">
                  {ins.tone === "caution" ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" /> : <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
                  <span className="text-foreground/80">{ins.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {!evaluation.completedAt ? (
            <Button className="w-full" onClick={complete} loading={pending && !critiquing} disabled={result.scoredCount === 0}>
              <CheckCircle2 /> Complete evaluation
            </Button>
          ) : (
            <DecisionDialog ideaId={evaluation.ideaId} evaluationId={evaluation.id} label="Decide" variant="default" size="default" />
          )}
          {(aiReady || device.active) && (
            <Button variant="outline" className="w-full" onClick={critique} loading={critiquing} disabled={result.scoredCount === 0 && answeredTotal === 0}>
              <Sparkles /> Ask AI to critique this
            </Button>
          )}
          {evaluation.decisions.length > 0 && (
            <div className="rounded-lg border border-dashed p-3 text-xs">
              {evaluation.decisions.map((d) => (
                <p key={d.id}>
                  <Badge tone={outcomeTone(d.outcome)}>{outcomeLabel(d.outcome)}</Badge> <span className="text-muted-foreground">{formatDate(d.decidedAt)}</span>
                  {d.rationale && <span className="mt-1 block text-foreground/80">{d.rationale}</span>}
                </p>
              ))}
            </div>
          )}
          <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-destructive">
            <Trash2 className="size-3" /> Delete this evaluation
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this evaluation?"
        description="This permanently removes these answers and scores. Decisions linked to it are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const res = await deleteEvaluation(evaluation.ideaId, evaluation.id);
          if (!res.ok) return void toast.error(res.error);
          router.push(`/ideas/${evaluation.ideaId}?tab=evaluations`);
        }}
      />
    </div>
  );
}
