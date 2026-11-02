"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, ChevronDown, Copy, Loader2, NotebookPen, Sparkles, Trash2, ShieldCheck } from "lucide-react";
import { runAIAction, sendAIMessage, deleteAIConversation } from "@/server/actions/ai";
import { addNote } from "@/server/actions/ideas";
import { AI_ACTIONS, type AIActionId } from "@/server/services/ai-actions";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/shared/markdown";
import { TimeAgo } from "@/components/shared/item-link";
import { EmptyState, SectionLabel } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export type ConversationView = {
  id: string; title: string; action: string; model: string | null; createdAt: Date; updatedAt: Date;
  messages: { id: string; role: "system" | "user" | "assistant"; content: string; createdAt: Date }[];
};

export function AIPanel({ ideaId, conversations, aiReady, otherIdeas, hasEvaluation, openConversation }: {
  ideaId: string; conversations: ConversationView[]; aiReady: boolean; otherIdeas: { id: string; title: string }[]; hasEvaluation: boolean; openConversation?: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState<AIActionId | null>(null);
  const [compareWith, setCompareWith] = useState("");
  const [question, setQuestion] = useState("");
  const [expanded, setExpanded] = useState<string | null>(openConversation ?? conversations[0]?.id ?? null);
  const [, start] = useTransition();

  if (!aiReady) {
    return (
      <EmptyState icon={Sparkles} title="The thinking partner is off" action={<Button asChild variant="outline" size="sm"><Link href="/settings#ai">Set up AI in Settings</Link></Button>}>
        Mindspace works fully without AI. If you connect an OpenAI-compatible provider, you can ask it to challenge and explore your ideas — only when you click.
      </EmptyState>
    );
  }

  const run = (action: AIActionId) => {
    if (action === "compare" && !compareWith) return toast.error("Choose an idea to compare with first");
    setRunning(action);
    start(async () => {
      const res = await runAIAction(ideaId, action, { compareWithId: compareWith || undefined, question: question.trim() || undefined });
      setRunning(null);
      if (!res.ok) return void toast.error(res.error);
      setQuestion("");
      setExpanded(res.data.id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          Nothing is sent until you click an action. Then this idea&apos;s text, notes and latest evaluations are sent to your configured AI provider. Replies are suggestions — they never change your idea.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AI_ACTIONS.map((a) => {
            const disabled = !!running || (a.id === "critique" && !hasEvaluation) || (a.id === "compare" && otherIdeas.length === 0);
            return (
              <div key={a.id} className={cn("rounded-lg border bg-card", a.id === "compare" && "sm:col-span-2")}>
                <button
                  disabled={disabled}
                  onClick={() => run(a.id)}
                  className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {running === a.id ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" /> : <Sparkles className="mt-0.5 size-4 shrink-0 text-primary/70" />}
                  <span>
                    <span className="block text-sm font-medium">{a.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {a.id === "critique" && !hasEvaluation ? "Evaluate the idea first." : a.description}
                    </span>
                  </span>
                </button>
                {a.id === "compare" && otherIdeas.length > 0 && (
                  <div className="px-3 pb-3">
                    <Select value={compareWith} onChange={(e) => setCompareWith(e.target.value)} className="h-8 w-full text-[13px]" aria-label="Idea to compare with">
                      <option value="">Choose an idea to compare with…</option>
                      {otherIdeas.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
                    </Select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Optional: add a specific question or angle to any action above…"
          rows={2}
          className="mt-2 text-[13px]"
          aria-label="Additional question"
        />
      </div>

      <div>
        <SectionLabel className="mb-3">Conversations</SectionLabel>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet. They&apos;re saved here so you can come back to them.</p>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <Conversation key={c.id} ideaId={ideaId} conv={c} open={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Conversation({ ideaId, conv, open, onToggle }: { ideaId: string; conv: ConversationView; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [sending, start] = useTransition();
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [first, ...rest] = conv.messages;

  const send = () => {
    const text = reply.trim();
    if (!text) return;
    setPendingText(text);
    setReply("");
    start(async () => {
      const res = await sendAIMessage(ideaId, conv.id, text);
      setPendingText(null);
      if (!res.ok) {
        setReply(text);
        return void toast.error(res.error);
      }
      router.refresh();
    });
  };

  const saveAsNote = (content: string) =>
    start(async () => {
      const res = await addNote(ideaId, `**From AI (${conv.title}):**\n\n${content}`);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Saved to Notes");
      router.refresh();
    });

  return (
    <div className="rounded-xl border bg-card">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <Sparkles className="size-4 shrink-0 text-primary/70" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{conv.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground"><TimeAgo date={conv.updatedAt} /></span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-4 border-t px-4 py-4">
          {first?.role === "user" && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none hover:text-foreground">What was sent</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-sans">{first.content}</pre>
            </details>
          )}
          {rest.map((m) =>
            m.role === "assistant" ? (
              <div key={m.id} className="group">
                <Markdown className="text-[14.5px]">{m.content}</Markdown>
                <div className="mt-2 flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  <Button size="xs" variant="ghost" onClick={() => saveAsNote(m.content)}><NotebookPen /> Save as note</Button>
                  <Button size="xs" variant="ghost" onClick={() => { void navigator.clipboard.writeText(m.content); toast.success("Copied"); }}><Copy /> Copy</Button>
                </div>
              </div>
            ) : (
              <div key={m.id} className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-accent px-3.5 py-2 text-sm text-accent-foreground whitespace-pre-wrap">{m.content}</div>
            ),
          )}
          {pendingText && (
            <>
              <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-accent px-3.5 py-2 text-sm text-accent-foreground whitespace-pre-wrap">{pendingText}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Thinking…</div>
            </>
          )}
          <div className="flex items-end gap-2 pt-2">
            <Textarea
              autoGrow
              rows={1}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Reply, push back, or ask a follow-up…"
              className="min-h-9 text-sm"
              aria-label="Reply"
            />
            <Button size="icon" onClick={send} disabled={!reply.trim()} loading={sending && !!pendingText} aria-label="Send">{!(sending && pendingText) && <ArrowUp />}</Button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{conv.model ?? ""}</span>
            <button
              onClick={() => start(async () => { const r = await deleteAIConversation(ideaId, conv.id); if (!r.ok) toast.error(r.error); router.refresh(); })}
              className="flex items-center gap-1 hover:text-destructive"
            >
              <Trash2 className="size-3" /> Delete conversation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
