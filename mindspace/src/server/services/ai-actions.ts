// Client-safe list of AI actions (no server imports).
export const AI_ACTIONS = [
  { id: "explore", label: "Explore this idea", description: "Clarifying questions and angles worth thinking about." },
  { id: "challenge", label: "Challenge my thinking", description: "Push back on the reasoning and assumptions." },
  { id: "weaknesses", label: "Find weaknesses", description: "Overlooked risks, gaps and failure modes." },
  { id: "improve", label: "Suggest improvements", description: "Ways to make the idea sharper or more viable." },
  { id: "mvp", label: "Generate an MVP plan", description: "The smallest version that tests the core assumption." },
  { id: "critique", label: "Critique my evaluation", description: "Review your latest evaluation and scores for blind spots." },
  { id: "compare", label: "Compare with another idea", description: "Trade-offs between two of your ideas." },
  { id: "summarize", label: "Summarize my thinking", description: "A neutral summary of everything you've written." },
] as const;
export type AIActionId = (typeof AI_ACTIONS)[number]["id"];
