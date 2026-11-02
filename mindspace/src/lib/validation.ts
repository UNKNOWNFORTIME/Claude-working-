import { z } from "zod";

export const uuid = z.uuid();

const trimmed = (max: number) => z.string().trim().max(max);
const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });

export const thoughtTypeEnum = z.enum(["IDEA", "TASK", "QUESTION", "GOAL", "OBSERVATION", "RANDOM"]);
export const ideaStageEnum = z.enum([
  "JUST_AN_IDEA", "EXPLORING", "EVALUATING", "WORTH_PURSUING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "ARCHIVED",
]);
export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const outcomeEnum = z.enum(["PURSUE", "RESEARCH_FURTHER", "REVISIT_LATER", "NOT_WORTH_PURSUING"]);
export const projectStatusEnum = z.enum(["PLANNED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
export const goalKindEnum = z.enum(["SHORT_TERM", "LONG_TERM", "CAREER", "LEARNING", "PERSONAL", "FINANCIAL", "CREATIVE"]);
export const goalStatusEnum = z.enum(["ACTIVE", "ACHIEVED", "PAUSED", "DROPPED"]);
export const entityTypeEnum = z.enum(["THOUGHT", "IDEA", "PROJECT", "GOAL"]);
export const reflectionKindEnum = z.enum(["WEEKLY", "PROJECT", "GOAL", "IDEA", "GENERAL"]);

export const tagNames = z.array(trimmed(40).min(1)).max(20);

export const thoughtCreateSchema = z.object({
  content: z.string().trim().min(1, "Write something first").max(50_000),
  type: thoughtTypeEnum.nullable().optional(),
  tags: tagNames.optional(),
});
export const thoughtUpdateSchema = z.object({
  content: z.string().trim().min(1).max(50_000).optional(),
  type: thoughtTypeEnum.nullable().optional(),
  tags: tagNames.optional(),
  pinned: z.boolean().optional(),
});

export const referenceSchema = z.object({
  title: trimmed(200).default(""),
  url: z.string().trim().url("Enter a valid URL").max(2000),
});

export const ideaCreateSchema = z.object({
  title: trimmed(200).min(1, "Give the idea a title"),
  summary: trimmed(500).optional(),
  description: z.string().max(100_000).optional(),
  categoryId: uuid.nullable().optional(),
  priority: priorityEnum.optional(),
  stage: ideaStageEnum.optional(),
  tags: tagNames.optional(),
});
export const ideaUpdateSchema = z.object({
  title: trimmed(200).min(1, "Title can't be empty").optional(),
  summary: trimmed(500).optional(),
  description: z.string().max(100_000).optional(),
  motivation: z.string().max(20_000).optional(),
  categoryId: uuid.nullable().optional(),
  priority: priorityEnum.optional(),
  stage: ideaStageEnum.optional(),
  tags: tagNames.optional(),
  references: z.array(referenceSchema).max(50).optional(),
});

export const scoresSchema = z.record(z.string(), z.number().int().min(1).max(10).nullable());
export const evaluationSaveSchema = z.object({
  answers: z.record(z.string(), z.string().max(20_000)).optional(),
  scores: scoresSchema.optional(),
  uncertainties: z.string().max(20_000).optional(),
});

export const decisionSchema = z.object({
  outcome: outcomeEnum,
  rationale: z.string().trim().max(20_000).default(""),
  evaluationId: uuid.nullable().optional(),
  revisitAt: optionalDate,
  decidedAt: optionalDate,
});

export const weightsSchema = z.record(z.string(), z.number().min(0).max(3));

export const categorySchema = z.object({
  name: trimmed(60).min(1, "Name is required"),
  color: trimmed(20).default("slate"),
});

export const projectCreateSchema = z.object({
  name: trimmed(200).min(1, "Name is required"),
  description: z.string().max(20_000).optional(),
  objective: z.string().max(5_000).optional(),
  expectedOutcome: z.string().max(5_000).optional(),
  status: projectStatusEnum.optional(),
  deadline: optionalDate,
  ideaId: uuid.nullable().optional(),
});
export const projectUpdateSchema = projectCreateSchema.partial().extend({
  notes: z.string().max(100_000).optional(),
});

export const milestoneSchema = z.object({
  title: trimmed(200).min(1, "Title is required"),
  dueDate: optionalDate,
});
export const taskSchema = z.object({
  title: trimmed(300).min(1, "Task can't be empty"),
  dueDate: optionalDate,
  milestoneId: uuid.nullable().optional(),
});

export const goalCreateSchema = z.object({
  title: trimmed(200).min(1, "Title is required"),
  kind: goalKindEnum.optional(),
  whyItMatters: z.string().max(10_000).optional(),
  targetDate: optionalDate,
});
export const goalUpdateSchema = goalCreateSchema.partial().extend({
  notes: z.string().max(100_000).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: goalStatusEnum.optional(),
});

export const reflectionSchema = z.object({
  kind: reflectionKindEnum,
  title: trimmed(200).optional(),
  content: z.string().max(100_000).optional(),
  answers: z.record(z.string(), z.string().max(20_000)).optional(),
  weekOf: optionalDate,
  entityType: entityTypeEnum.nullable().optional(),
  entityId: uuid.nullable().optional(),
});

export const linkSchema = z.object({
  fromType: entityTypeEnum,
  fromId: uuid,
  toType: entityTypeEnum,
  toId: uuid,
  note: trimmed(300).optional(),
});

export const aiSettingsSchema = z.object({
  aiEnabled: z.boolean(),
  aiProvider: z.enum(["local", "remote"]).default("local"),
  localModel: z.string().trim().max(200).regex(/^$|^[A-Za-z0-9][A-Za-z0-9._-]*\.gguf$/, "Invalid model file").optional(),
  aiBaseUrl: z.string().trim().url("Enter a valid URL").max(500).or(z.literal("")),
  aiModel: trimmed(100),
  // undefined = keep existing, "" = clear
  aiApiKey: z.string().trim().max(500).optional(),
});

export const passwordSchema = z.string().min(10, "Use at least 10 characters").max(200);
