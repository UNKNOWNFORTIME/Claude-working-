import { describe, expect, it } from "vitest";
import { CRITERION_KEYS, DEFAULT_WEIGHTS, computeScore, normalizeWeights, scoreBand, scoreInsights, type Scores } from "@/lib/scoring";

const all = (n: number): Scores => Object.fromEntries(CRITERION_KEYS.map((k) => [k, n]));

describe("computeScore", () => {
  it("returns 100 when every criterion is 10 and 10 when every criterion is 1", () => {
    expect(computeScore(all(10)).overall).toBe(100);
    expect(computeScore(all(1)).overall).toBe(10);
  });

  it("computes an equal-weighted average out of 100", () => {
    const scores: Scores = { personalInterest: 8, potentialImpact: 6, feasibility: 7, skillAlignment: 5, costEfficiency: 9, timeEfficiency: 4, longTermValue: 10 };
    // (8+6+7+5+9+4+10) / 70 * 100 = 70
    expect(computeScore(scores).overall).toBe(70);
  });

  it("applies weights", () => {
    const scores: Scores = { ...all(5), personalInterest: 10 };
    const weights = { ...DEFAULT_WEIGHTS, personalInterest: 3 };
    // (10*3 + 5*6) / (10 * 9) * 100 = 66.7
    expect(computeScore(scores, weights).overall).toBe(66.7);
  });

  it("ignores zero-weighted criteria", () => {
    const scores: Scores = { ...all(8), costEfficiency: 1 };
    const res = computeScore(scores, { ...DEFAULT_WEIGHTS, costEfficiency: 0 });
    expect(res.overall).toBe(80);
  });

  it("produces a breakdown whose points sum to the overall score", () => {
    const scores: Scores = { personalInterest: 9, potentialImpact: 3, feasibility: 6, skillAlignment: 7, costEfficiency: 2, timeEfficiency: 8, longTermValue: 5 };
    const weights = { ...DEFAULT_WEIGHTS, potentialImpact: 2, feasibility: 1.5, timeEfficiency: 0.5 };
    const res = computeScore(scores, weights);
    const sum = res.breakdown.reduce((s, b) => s + b.points, 0);
    expect(Math.abs(sum - res.overall!)).toBeLessThan(0.5);
    const maxSum = res.breakdown.reduce((s, b) => s + b.maxPoints, 0);
    expect(Math.abs(maxSum - 100)).toBeLessThan(0.5);
  });

  it("handles partial scoring and flags it as incomplete", () => {
    const res = computeScore({ personalInterest: 8, feasibility: 6 });
    expect(res.overall).toBe(70);
    expect(res.complete).toBe(false);
    expect(res.scoredCount).toBe(2);
  });

  it("returns null when nothing is scored", () => {
    expect(computeScore({}).overall).toBeNull();
  });

  it("ignores out-of-range or non-integer scores", () => {
    const res = computeScore({ personalInterest: 11, feasibility: 0, skillAlignment: 5.5, longTermValue: 6 });
    expect(res.scoredCount).toBe(1);
    expect(res.overall).toBe(60);
  });
});

describe("normalizeWeights", () => {
  it("fills defaults and clamps to 0–3", () => {
    const w = normalizeWeights({ personalInterest: 10, feasibility: -2, longTermValue: "x" });
    expect(w.personalInterest).toBe(3);
    expect(w.feasibility).toBe(0);
    expect(w.longTermValue).toBe(1);
  });
  it("tolerates garbage input", () => {
    expect(normalizeWeights(null)).toEqual(DEFAULT_WEIGHTS);
  });
});

describe("scoreBand & insights", () => {
  it("bands scores", () => {
    expect(scoreBand(80)).toBe("strong");
    expect(scoreBand(60)).toBe("promising");
    expect(scoreBand(45)).toBe("mixed");
    expect(scoreBand(20)).toBe("weak");
  });

  it("warns when a high total hides a very weak dimension", () => {
    const res = computeScore({ ...all(9), feasibility: 2 });
    const insights = scoreInsights(res);
    expect(insights.some((i) => i.tone === "caution" && i.text.includes("feasibility"))).toBe(true);
  });

  it("flags excitement without feasibility", () => {
    const res = computeScore({ ...all(6), personalInterest: 9, feasibility: 3 });
    expect(scoreInsights(res).some((i) => i.text.includes("hard to execute"))).toBe(true);
  });

  it("nudges when risks are unanswered", () => {
    const res = computeScore(all(7));
    expect(scoreInsights(res, { unansweredRiskQuestions: 4 }).some((i) => i.text.includes("risks"))).toBe(true);
  });
});
