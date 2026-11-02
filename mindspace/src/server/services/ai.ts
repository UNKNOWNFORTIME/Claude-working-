import { db } from "@/lib/db";
import { EVALUATION_SECTIONS } from "@/lib/evaluation-questions";
import { criterionLabel } from "@/lib/scoring";
import { stageLabel } from "@/lib/constants";
import { getAIConfig, type AIConfig } from "./settings";
import { localChat } from "./local-ai";
import { ownedIdea } from "./ideas";
import { NotFoundError, ValidationError } from "./errors";

import { AI_ACTIONS, type AIActionId } from "./ai-actions";
export { AI_ACTIONS, type AIActionId };

const SYSTEM_PROMPT = `You are a thinking partner inside Mindspace, a private app where one person develops and evaluates their own ideas.

Your role is analytical, not cheerleading. Be warm but direct. Help the person think more clearly; do not think for them.

Rules you must always follow:
1. Clearly separate three kinds of statements. Label them inline when it matters:
   - "You wrote:" — things the person actually provided.
   - "Assumption:" — things you or they are taking for granted that have not been checked.
   - "Generally known:" — widely established knowledge. Use sparingly.
2. Never invent market research, statistics, costs, competitor details, user numbers or other evidence. If a number would help, say what to measure and how to find it instead of guessing. If you mention possible existing solutions, say they need to be verified.
3. Do not simply agree. Point out weak assumptions, risks and alternative perspectives, even when the idea is exciting.
4. Prefer concrete, testable next steps (cheap experiments, conversations to have, questions to answer) over generic advice.
5. Ask clarifying questions when the idea is vague. End with 2–4 sharp questions when exploring.
6. Never claim to have changed, saved or overwritten the person's notes. You only suggest; they decide.
7. Be concise. Use short sections with markdown headings or bullet points. No filler, no flattery.`;

/** Shorter instructions for small on-device models, same principles. */
const COMPACT_SYSTEM_PROMPT = `You are a critical thinking partner helping one person judge their own idea.
Rules: be direct, not flattering. Separate what they wrote ("You wrote:") from assumptions ("Assumption:"). Never invent statistics, prices, competitors or research — say what to check instead. Suggest cheap, concrete next steps. Use short bullet points. End with 2–3 sharp questions.`;

const ACTION_PROMPTS: Record<AIActionId, string> = {
  explore:
    "Help me explore this idea. Identify what is still vague, the key questions I should answer (who exactly, what specific problem, existing alternatives, smallest version, how to test demand), and 2–3 different directions it could take.",
  challenge:
    "Challenge my thinking on this idea. Identify the weakest assumptions in what I wrote, argue the strongest case against it, and tell me what evidence would change your mind.",
  weaknesses:
    "Find the weaknesses in this idea: overlooked risks, failure modes, dependencies, and things I may be underestimating (time, cost, skills, motivation). Rank them by how likely they are to sink the idea.",
  improve:
    "Suggest concrete improvements: ways to narrow the scope, sharpen the value, reduce risk, or make it a better fit for me based on what I wrote. Explain the trade-off of each suggestion.",
  mvp:
    "Propose a realistic MVP plan: the single core assumption to test first, the smallest thing I could build or do to test it, what I'd measure, a rough sequence of 3–6 steps, and what I should explicitly NOT build yet. Do not invent time or cost figures; if useful, list what determines them.",
  critique:
    "Critique my most recent evaluation of this idea. Where do my scores look inconsistent with my written answers? Which answers are thin or overconfident? Which important questions did I skip? Do not re-score it for me — point out what I should reconsider.",
  compare:
    "Compare these two ideas of mine. Lay out the trade-offs (value, fit, feasibility, cost, time, risk, long-term value) based only on what I wrote, note where information is missing, and suggest what would help me choose. Do not declare a winner unless the evidence I provided clearly supports it.",
  summarize:
    "Summarize my thinking about this idea neutrally: what it is, why I care, what I've concluded so far, open questions, and where my evaluations or decisions have changed over time. Do not add new opinions.",
};

async function ideaContext(userId: string, ideaId: string) {
  const idea = await db.idea.findFirst({
    where: { id: ideaId, userId, deletedAt: null },
    include: {
      category: true,
      tags: { include: { tag: true } },
      notes: { orderBy: { createdAt: "desc" }, take: 15 },
      evaluations: { orderBy: { createdAt: "desc" }, take: 2, include: { scores: true } },
      decisions: { orderBy: { decidedAt: "desc" }, take: 5 },
    },
  });
  if (!idea) throw new NotFoundError("Idea");

  const parts: string[] = [
    `# Idea: ${idea.title}`,
    `Stage: ${stageLabel(idea.stage)} · Priority: ${idea.priority}${idea.category ? ` · Category: ${idea.category.name}` : ""}`,
  ];
  if (idea.tags.length) parts.push(`Tags: ${idea.tags.map((t) => t.tag.name).join(", ")}`);
  if (idea.summary) parts.push(`## Summary (written by me)\n${idea.summary}`);
  if (idea.description) parts.push(`## Description (written by me)\n${idea.description.slice(0, 8000)}`);
  if (idea.motivation) parts.push(`## Why I care (written by me)\n${idea.motivation.slice(0, 3000)}`);
  if (idea.notes.length) parts.push(`## My notes\n${idea.notes.map((n) => `- ${n.content.slice(0, 1200)}`).join("\n")}`);

  for (const [i, ev] of idea.evaluations.entries()) {
    const answers = (ev.answers ?? {}) as Record<string, string>;
    const lines: string[] = [`## ${i === 0 ? "My latest evaluation" : "My previous evaluation"} (${ev.createdAt.toDateString()})`];
    if (ev.overallScore != null) lines.push(`Overall score: ${ev.overallScore}/100`);
    if (ev.scores.length) lines.push(`Scores (1–10, weight): ${ev.scores.map((s) => `${criterionLabel(s.criterion)} ${s.score} (w${s.weight})`).join("; ")}`);
    for (const section of EVALUATION_SECTIONS) {
      const qa = section.questions.filter((q) => answers[q.id]?.trim()).map((q) => `- ${q.text} → ${answers[q.id].trim().slice(0, 1500)}`);
      if (qa.length) lines.push(`### ${section.title}\n${qa.join("\n")}`);
    }
    if (ev.uncertainties) lines.push(`### What I'm unsure about\n${ev.uncertainties}`);
    parts.push(lines.join("\n"));
  }
  if (idea.decisions.length) {
    parts.push(`## My decisions\n${idea.decisions.map((d) => `- ${d.decidedAt.toDateString()}: ${d.outcome}${d.rationale ? ` — ${d.rationale.slice(0, 800)}` : ""}`).join("\n")}`);
  }
  return { idea, text: parts.join("\n\n") };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(cfg: AIConfig, messages: ChatMessage[], fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!cfg.enabled) throw new ValidationError("AI features are turned off. Enable them in Settings.");
  if (cfg.provider === "local") {
    if (!cfg.localModel) throw new ValidationError("No offline model is downloaded yet. Run: npm run ai:download");
    return localChat(cfg.localModel, messages);
  }
  if (!cfg.apiKey) throw new ValidationError("No AI API key configured. Add one in Settings.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0.5 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let detail = body.slice(0, 300);
      try {
        detail = JSON.parse(body)?.error?.message ?? detail;
      } catch {}
      throw new ValidationError(`AI provider returned ${res.status}${detail ? `: ${detail}` : ""}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new ValidationError("AI provider returned an empty response");
    return content;
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    if ((e as Error).name === "AbortError") throw new ValidationError("The AI provider took too long to respond");
    throw new ValidationError(`Could not reach the AI provider: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Builds the messages for an AI action from what I've written. Nothing is sent
 * anywhere here — used both by the server providers and by on-device AI.
 * `compact` keeps the prompt small for phone-sized models.
 */
export async function buildActionMessages(userId: string, ideaId: string, action: AIActionId, opts: { compareWithId?: string; question?: string; compact?: boolean } = {}) {
  const def = AI_ACTIONS.find((a) => a.id === action);
  if (!def) throw new ValidationError("Unknown action");
  const { idea, text } = await ideaContext(userId, ideaId);
  let context = text;
  let title = `${def.label}`;
  if (action === "compare") {
    if (!opts.compareWithId) throw new ValidationError("Choose an idea to compare with");
    await ownedIdea(userId, opts.compareWithId);
    const other = await ideaContext(userId, opts.compareWithId);
    context = opts.compact ? `${text.slice(0, 3500)}\n\n---\n\n${other.text.slice(0, 3500)}` : `${text}\n\n---\n\n${other.text}`;
    title = `Compare with “${other.idea.title}”`;
  }
  if (action === "critique" && !idea.evaluations.length) throw new ValidationError("Evaluate this idea first, then ask for a critique");
  if (opts.compact && context.length > 4500) context = context.slice(0, 4500) + "\n[…shortened for the on-device model]";
  const userPrompt = `${ACTION_PROMPTS[action]}${opts.question ? `\n\nAlso: ${opts.question}` : ""}\n\n---\nEverything below was written by me:\n\n${context}`;
  const messages: ChatMessage[] = [
    { role: "system", content: opts.compact ? COMPACT_SYSTEM_PROMPT : SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
  return { title, messages };
}

export async function saveConversation(userId: string, ideaId: string, data: { action: string; title: string; model: string | null; messages: ChatMessage[] }) {
  return db.aIConversation.create({
    data: {
      userId,
      ideaId,
      action: data.action,
      title: data.title.slice(0, 200),
      model: data.model?.slice(0, 120) ?? null,
      messages: { create: data.messages.map((m, i) => ({ role: m.role, content: m.content.slice(0, 100_000), createdAt: new Date(Date.now() + i) })) },
    },
  });
}

/**
 * Runs an AI action on an idea with the configured server provider (built-in
 * offline model or an API). Only called from an explicit user click. The reply
 * is stored as a conversation; it never modifies the idea itself.
 */
export async function runIdeaAction(userId: string, ideaId: string, action: AIActionId, opts: { compareWithId?: string; question?: string } = {}) {
  const cfg = await getAIConfig(userId);
  const { title, messages } = await buildActionMessages(userId, ideaId, action, opts);
  const reply = await chatCompletion(cfg, messages);
  return saveConversation(userId, ideaId, {
    action,
    title,
    model: cfg.provider === "local" ? `offline · ${cfg.localModel}` : cfg.model,
    messages: [...messages, { role: "assistant", content: reply }],
  });
}

/** Stores a turn generated on the user's device (phone/browser model). */
export async function appendMessages(userId: string, conversationId: string, turns: ChatMessage[]) {
  const conv = await db.aIConversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } });
  if (!conv) throw new NotFoundError("Conversation");
  const now = Date.now();
  await db.aIMessage.createMany({
    data: turns.filter((t) => t.role !== "system").map((t, i) => ({ conversationId, role: t.role, content: t.content.slice(0, 100_000), createdAt: new Date(now + i) })),
  });
  await db.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
}

export async function continueConversation(userId: string, conversationId: string, content: string) {
  const text = content.trim();
  if (!text) throw new ValidationError("Write a message first");
  const conv = await db.aIConversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) throw new NotFoundError("Conversation");
  const cfg = await getAIConfig(userId);
  const history: ChatMessage[] = conv.messages.map((m) => ({ role: m.role, content: m.content }));
  const reply = await chatCompletion(cfg, [...history, { role: "user", content: text.slice(0, 20_000) }]);
  const now = Date.now();
  await db.aIMessage.createMany({
    data: [
      { conversationId, role: "user", content: text, createdAt: new Date(now) },
      { conversationId, role: "assistant", content: reply, createdAt: new Date(now + 1) },
    ],
  });
  await db.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  return reply;
}

export async function listConversations(userId: string, ideaId: string) {
  return db.aIConversation.findMany({
    where: { userId, ideaId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function deleteConversation(userId: string, id: string) {
  const res = await db.aIConversation.deleteMany({ where: { id, userId } });
  if (!res.count) throw new NotFoundError("Conversation");
}
