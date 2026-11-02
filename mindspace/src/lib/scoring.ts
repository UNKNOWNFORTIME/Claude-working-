/**
 * Transparent, weighted idea scoring.
 *
 * overall = Σ(score_i × weight_i) / Σ(10 × weight_i) × 100
 *
 * Only criteria that have been scored are included, so a partially scored
 * evaluation still produces a result — but it is flagged as incomplete.
 */

export const CRITERIA = [
  {
    key: "personalInterest",
    label: "Personal interest",
    hint: "How much do I genuinely want to work on this — not just today, but in three months?",
  },
  {
    key: "potentialImpact",
    label: "Potential impact",
    hint: "How much value could this create for me or others if it works?",
  },
  {
    key: "feasibility",
    label: "Feasibility",
    hint: "Can I realistically execute this with what I have or can acquire?",
  },
  {
    key: "skillAlignment",
    label: "Skill alignment",
    hint: "How well does this fit skills I have — or skills I actually want to build?",
  },
  {
    key: "costEfficiency",
    label: "Cost efficiency",
    hint: "10 = cheap relative to its value. 1 = expensive relative to its value.",
  },
  {
    key: "timeEfficiency",
    label: "Time efficiency",
    hint: "10 = a first milestone is quick to reach. 1 = a long road before anything useful.",
  },
  {
    key: "longTermValue",
    label: "Long-term value",
    hint: "Will this still matter in a year? Does it compound?",
  },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];
export type Weights = Record<CriterionKey, number>;
export type Scores = Partial<Record<CriterionKey, number | null>>;

export const CRITERION_KEYS = CRITERIA.map((c) => c.key) as CriterionKey[];

export const DEFAULT_WEIGHTS: Weights = {
  personalInterest: 1,
  potentialImpact: 1,
  feasibility: 1,
  skillAlignment: 1,
  costEfficiency: 1,
  timeEfficiency: 1,
  longTermValue: 1,
};

export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 3;
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

export function criterionLabel(key: string) {
  return CRITERIA.find((c) => c.key === key)?.label ?? key;
}

/** Merge stored (possibly partial / malformed) weights with defaults and clamp. */
export function normalizeWeights(input: unknown): Weights {
  const out = { ...DEFAULT_WEIGHTS };
  if (input && typeof input === "object") {
    for (const key of CRITERION_KEYS) {
      const v = (input as Record<string, unknown>)[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        out[key] = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, v));
      }
    }
  }
  return out;
}

export function isValidScore(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= MIN_SCORE && v <= MAX_SCORE;
}

export interface CriterionBreakdown {
  key: CriterionKey;
  label: string;
  score: number | null;
  weight: number;
  /** share of the total weight, 0–1 */
  weightShare: number;
  /** points this criterion contributes to the /100 total */
  points: number;
  /** points it could have contributed with a 10 */
  maxPoints: number;
}

export interface ScoreResult {
  overall: number | null;
  breakdown: CriterionBreakdown[];
  scoredCount: number;
  complete: boolean;
  totalWeight: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeScore(scores: Scores, weightsInput: Partial<Weights> = DEFAULT_WEIGHTS): ScoreResult {
  const weights = normalizeWeights(weightsInput);
  const scored = CRITERION_KEYS.filter((k) => isValidScore(scores[k]));
  const totalWeight = scored.reduce((sum, k) => sum + weights[k], 0);

  const breakdown: CriterionBreakdown[] = CRITERIA.map(({ key, label }) => {
    const score = isValidScore(scores[key]) ? (scores[key] as number) : null;
    const weight = weights[key];
    const included = score !== null && totalWeight > 0;
    const weightShare = included ? weight / totalWeight : 0;
    return {
      key,
      label,
      score,
      weight,
      weightShare,
      points: included ? round1(((score as number) * weight * 100) / (10 * totalWeight)) : 0,
      maxPoints: included ? round1((weight * 100) / totalWeight) : 0,
    };
  });

  const overall =
    totalWeight > 0
      ? round1(scored.reduce((sum, k) => sum + (scores[k] as number) * weights[k], 0) / (10 * totalWeight) * 100)
      : null;

  return {
    overall,
    breakdown,
    scoredCount: scored.length,
    complete: scored.length === CRITERION_KEYS.length,
    totalWeight,
  };
}

export type ScoreBand = "strong" | "promising" | "mixed" | "weak";

export function scoreBand(overall: number): ScoreBand {
  if (overall >= 75) return "strong";
  if (overall >= 58) return "promising";
  if (overall >= 42) return "mixed";
  return "weak";
}

export const BAND_COPY: Record<ScoreBand, { label: string; text: string }> = {
  strong: {
    label: "Strong signal",
    text: "Scores well across what you weighted most. Still check the weak spots and open questions below before committing.",
  },
  promising: {
    label: "Promising, with trade-offs",
    text: "There is something here, but some dimensions are holding it back. Consider what would need to change.",
  },
  mixed: {
    label: "Mixed signal",
    text: "The case for and against is roughly balanced. Research or a small test may tell you more than further scoring.",
  },
  weak: {
    label: "Weak signal",
    text: "On your own scoring, this is hard to justify right now. That is a valid and useful outcome.",
  },
};

export interface Insight {
  tone: "caution" | "info";
  text: string;
}

/**
 * Deterministic observations about trade-offs and uncertainty. These exist so a
 * single number is never read as a verdict.
 */
export function scoreInsights(result: ScoreResult, opts: { risksWritten?: boolean; hasUncertainties?: boolean } = {}): Insight[] {
  const s = Object.fromEntries(result.breakdown.map((b) => [b.key, b.score])) as Record<CriterionKey, number | null>;
  const out: Insight[] = [];

  if (!result.complete) {
    out.push({
      tone: "info",
      text: `Only ${result.scoredCount} of ${CRITERION_KEYS.length} criteria are scored, so the total reflects part of the picture.`,
    });
  }

  const weak = result.breakdown.filter((b) => b.score !== null && b.score <= 3 && b.weight > 0);
  if (weak.length && result.overall !== null && result.overall >= 58) {
    out.push({
      tone: "caution",
      text: `${result.overall >= 75 ? "High" : "Reasonable"} overall score, but ${weak.map((w) => `${w.label.toLowerCase()} (${w.score}/10)`).join(", ")} ${weak.length > 1 ? "are" : "is"} very low. One weak dimension can sink an otherwise good idea.`,
    });
  } else if (weak.length) {
    out.push({
      tone: "caution",
      text: `Weak spot${weak.length > 1 ? "s" : ""}: ${weak.map((w) => w.label.toLowerCase()).join(", ")}.`,
    });
  }

  if (s.personalInterest !== null && s.potentialImpact !== null) {
    if (s.personalInterest <= 4 && s.potentialImpact >= 7) {
      out.push({ tone: "caution", text: "Potentially valuable, but your interest is low. Will you sustain it once the novelty fades?" });
    }
    if (s.personalInterest >= 8 && s.potentialImpact <= 4) {
      out.push({ tone: "info", text: "You're excited, but you expect limited impact. That can be fine for learning or fun — be honest about which it is." });
    }
  }
  if (s.personalInterest !== null && s.feasibility !== null && s.personalInterest >= 7 && s.feasibility <= 4) {
    out.push({ tone: "caution", text: "Exciting but hard to execute. Is there a smaller first milestone that tests the core idea?" });
  }
  if (s.timeEfficiency !== null && s.longTermValue !== null && s.timeEfficiency <= 3 && s.longTermValue >= 8) {
    out.push({ tone: "info", text: "A long road, but you believe it compounds. Make sure the first milestone is still worth having on its own." });
  }

  if (opts.risksWritten === false && result.scoredCount > 0) {
    out.push({ tone: "caution", text: "You haven't written down the risks yet. Scores without named risks tend to be optimistic." });
  }
  if (opts.hasUncertainties === false) {
    out.push({ tone: "info", text: "Consider noting what you're unsure about — which assumptions would change these scores?" });
  }

  return out;
}
