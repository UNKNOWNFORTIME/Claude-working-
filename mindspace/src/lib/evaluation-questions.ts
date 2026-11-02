export interface EvalQuestion {
  id: string;
  text: string;
}
export interface EvalSection {
  id: string;
  letter: string;
  title: string;
  description: string;
  questions: EvalQuestion[];
}

export const EVALUATION_SECTIONS: EvalSection[] = [
  {
    id: "problem",
    letter: "A",
    title: "Problem & value",
    description: "What is this actually for?",
    questions: [
      { id: "problem.what", text: "What problem does this idea solve?" },
      { id: "problem.who", text: "Who benefits from it?" },
      { id: "problem.significant", text: "Is the problem significant? How do you know?" },
      { id: "problem.useful", text: "What makes this idea useful compared to alternatives?" },
    ],
  },
  {
    id: "motivation",
    letter: "B",
    title: "Personal motivation",
    description: "Why you, why this?",
    questions: [
      { id: "motivation.why", text: "Why do I want to do this?" },
      { id: "motivation.interest", text: "Am I genuinely interested, or is it just novel?" },
      { id: "motivation.alignment", text: "Does it align with my long-term goals?" },
      { id: "motivation.threeMonths", text: "Will I still care about it in three months?" },
    ],
  },
  {
    id: "feasibility",
    letter: "C",
    title: "Feasibility",
    description: "Can it realistically be done?",
    questions: [
      { id: "feasibility.skills", text: "Do I have the required skills?" },
      { id: "feasibility.learn", text: "What skills would I need to learn?" },
      { id: "feasibility.resources", text: "What resources are required?" },
      { id: "feasibility.difficulty", text: "How technically difficult is it?" },
      { id: "feasibility.execute", text: "Can I realistically execute it?" },
    ],
  },
  {
    id: "cost",
    letter: "D",
    title: "Cost & time",
    description: "What will it take?",
    questions: [
      { id: "cost.money", text: "How much could it cost?" },
      { id: "cost.mvp", text: "How long would an MVP or first milestone take?" },
      { id: "cost.ongoing", text: "What ongoing commitments would it require?" },
    ],
  },
  {
    id: "potential",
    letter: "E",
    title: "Potential & impact",
    description: "What could it become?",
    questions: [
      { id: "potential.gain", text: "What could I gain?" },
      { id: "potential.revenue", text: "Could it generate revenue?" },
      { id: "potential.career", text: "Could it improve my portfolio or career?" },
      { id: "potential.learning", text: "Could it help me learn something valuable?" },
      { id: "potential.longTerm", text: "What is the long-term potential?" },
    ],
  },
  {
    id: "risks",
    letter: "F",
    title: "Risks",
    description: "Be your own sceptic.",
    questions: [
      { id: "risks.wrong", text: "What could go wrong?" },
      { id: "risks.fail", text: "Why might it fail?" },
      { id: "risks.assumptions", text: "What assumptions need validation?" },
      { id: "risks.abandon", text: "What would make me abandon the idea?" },
    ],
  },
  {
    id: "opportunity",
    letter: "G",
    title: "Opportunity cost",
    description: "What are you saying no to?",
    questions: [
      { id: "opportunity.alternatives", text: "What other things could I do with the same time?" },
      { id: "opportunity.priority", text: "Is this worth prioritising over my other ideas?" },
    ],
  },
];

export const ALL_QUESTION_IDS = EVALUATION_SECTIONS.flatMap((s) => s.questions.map((q) => q.id));
export const RISK_QUESTION_IDS = EVALUATION_SECTIONS.find((s) => s.id === "risks")!.questions.map((q) => q.id);

export function questionText(id: string) {
  for (const s of EVALUATION_SECTIONS) {
    const q = s.questions.find((q) => q.id === id);
    if (q) return q.text;
  }
  return id;
}

export function countAnswered(answers: Record<string, string>, ids = ALL_QUESTION_IDS) {
  return ids.filter((id) => (answers[id] ?? "").trim().length > 0).length;
}
