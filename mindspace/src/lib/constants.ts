import type {
  DecisionOutcome,
  GoalKind,
  GoalStatus,
  IdeaStage,
  Priority,
  ProjectStatus,
  ThoughtType,
  EntityType,
} from "@prisma/client";

export const THOUGHT_TYPES: { value: ThoughtType; label: string }[] = [
  { value: "IDEA", label: "Idea" },
  { value: "TASK", label: "Task" },
  { value: "QUESTION", label: "Question" },
  { value: "GOAL", label: "Goal" },
  { value: "OBSERVATION", label: "Observation" },
  { value: "RANDOM", label: "Random thought" },
];
export const thoughtTypeLabel = (t: ThoughtType | null) => THOUGHT_TYPES.find((x) => x.value === t)?.label ?? "Unclassified";

export const IDEA_STAGES: { value: IdeaStage; label: string; tone: string }[] = [
  { value: "JUST_AN_IDEA", label: "Just an idea", tone: "slate" },
  { value: "EXPLORING", label: "Exploring", tone: "sky" },
  { value: "EVALUATING", label: "Evaluating", tone: "violet" },
  { value: "WORTH_PURSUING", label: "Worth pursuing", tone: "emerald" },
  { value: "IN_PROGRESS", label: "In progress", tone: "amber" },
  { value: "ON_HOLD", label: "On hold", tone: "stone" },
  { value: "COMPLETED", label: "Completed", tone: "teal" },
  { value: "ARCHIVED", label: "Archived", tone: "zinc" },
];
export const stageLabel = (s: IdeaStage) => IDEA_STAGES.find((x) => x.value === s)?.label ?? s;
export const stageTone = (s: IdeaStage) => IDEA_STAGES.find((x) => x.value === s)?.tone ?? "slate";

export const PRIORITIES: { value: Priority; label: string; rank: number }[] = [
  { value: "LOW", label: "Low", rank: 1 },
  { value: "MEDIUM", label: "Medium", rank: 2 },
  { value: "HIGH", label: "High", rank: 3 },
  { value: "URGENT", label: "Urgent", rank: 4 },
];
export const priorityLabel = (p: Priority) => PRIORITIES.find((x) => x.value === p)?.label ?? p;

export const DECISION_OUTCOMES: { value: DecisionOutcome; label: string; description: string; tone: string }[] = [
  { value: "PURSUE", label: "Pursue", description: "Worth investing time in now.", tone: "emerald" },
  { value: "RESEARCH_FURTHER", label: "Research further", description: "Promising, but key questions are open.", tone: "sky" },
  { value: "REVISIT_LATER", label: "Revisit later", description: "Not now — but don't forget it.", tone: "amber" },
  { value: "NOT_WORTH_PURSUING", label: "Not worth pursuing", description: "A clear, considered no.", tone: "rose" },
];
export const outcomeLabel = (o: DecisionOutcome) => DECISION_OUTCOMES.find((x) => x.value === o)?.label ?? o;
export const outcomeTone = (o: DecisionOutcome) => DECISION_OUTCOMES.find((x) => x.value === o)?.tone ?? "slate";

/** How a decision moves the idea through its stages. */
export const OUTCOME_TO_STAGE: Record<DecisionOutcome, IdeaStage> = {
  PURSUE: "WORTH_PURSUING",
  RESEARCH_FURTHER: "EXPLORING",
  REVISIT_LATER: "ON_HOLD",
  NOT_WORTH_PURSUING: "ARCHIVED",
};

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; tone: string }[] = [
  { value: "PLANNED", label: "Planned", tone: "slate" },
  { value: "ACTIVE", label: "Active", tone: "emerald" },
  { value: "PAUSED", label: "Paused", tone: "amber" },
  { value: "COMPLETED", label: "Completed", tone: "teal" },
  { value: "CANCELLED", label: "Cancelled", tone: "zinc" },
];
export const projectStatusLabel = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.value === s)?.label ?? s;
export const projectStatusTone = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.value === s)?.tone ?? "slate";

export const GOAL_KINDS: { value: GoalKind; label: string }[] = [
  { value: "SHORT_TERM", label: "Short-term" },
  { value: "LONG_TERM", label: "Long-term" },
  { value: "CAREER", label: "Career" },
  { value: "LEARNING", label: "Learning" },
  { value: "PERSONAL", label: "Personal" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "CREATIVE", label: "Creative" },
];
export const goalKindLabel = (k: GoalKind) => GOAL_KINDS.find((x) => x.value === k)?.label ?? k;

export const GOAL_STATUSES: { value: GoalStatus; label: string; tone: string }[] = [
  { value: "ACTIVE", label: "Active", tone: "emerald" },
  { value: "ACHIEVED", label: "Achieved", tone: "teal" },
  { value: "PAUSED", label: "Paused", tone: "amber" },
  { value: "DROPPED", label: "Dropped", tone: "zinc" },
];
export const goalStatusLabel = (s: GoalStatus) => GOAL_STATUSES.find((x) => x.value === s)?.label ?? s;
export const goalStatusTone = (s: GoalStatus) => GOAL_STATUSES.find((x) => x.value === s)?.tone ?? "slate";

export const ENTITY_LABELS: Record<EntityType, string> = {
  THOUGHT: "Thought",
  IDEA: "Idea",
  PROJECT: "Project",
  GOAL: "Goal",
};

export function entityHref(type: EntityType, id: string) {
  switch (type) {
    case "IDEA":
      return `/ideas/${id}`;
    case "PROJECT":
      return `/projects/${id}`;
    case "GOAL":
      return `/goals/${id}`;
    case "THOUGHT":
      return `/inbox?thought=${id}`;
  }
}

export const CATEGORY_COLORS = ["slate", "rose", "amber", "emerald", "teal", "sky", "violet", "pink"] as const;

export const WEEKLY_PROMPTS = [
  { id: "progress", text: "What moved forward this week?" },
  { id: "learned", text: "What did I learn — about the work or about myself?" },
  { id: "stuck", text: "Where did I get stuck, and why?" },
  { id: "attention", text: "What kept pulling at my attention?" },
  { id: "drop", text: "Is there anything I should stop or let go of?" },
  { id: "next", text: "What matters most next week?" },
];
