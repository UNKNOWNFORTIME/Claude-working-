/**
 * Development seed: realistic sample data so every screen has something in it.
 * Creates a demo account if no account exists (demo@mindspace.local / mindspace-demo),
 * otherwise adds sample data to the existing account. Run: npm run db:seed
 */
import "../scripts/load-env";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { createThought, convertThoughtToIdea } from "../src/server/services/thoughts";
import { createIdea, addIdeaNote, updateIdea } from "../src/server/services/ideas";
import { startEvaluation, saveEvaluation, completeEvaluation, recordDecision } from "../src/server/services/evaluations";
import { convertIdeaToProject, addMilestone, addTask, updateTask, updateProject } from "../src/server/services/projects";
import { createGoal, updateGoal } from "../src/server/services/goals";
import { createLink } from "../src/server/services/links";
import { createCategory } from "../src/server/services/taxonomy";
import { saveReflection } from "../src/server/services/reflections";
import { startOfWeek } from "../src/lib/utils";

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

async function main() {
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: { email: "demo@mindspace.local", name: "Demo", passwordHash: await bcrypt.hash("mindspace-demo", 12), settings: { create: {} } },
    });
    console.log("Created demo account: demo@mindspace.local / mindspace-demo");
  }
  const uid = user.id;
  if (await db.idea.count({ where: { userId: uid } })) {
    console.log("Account already has ideas — skipping seed.");
    return;
  }

  const [business, learning, creative] = await Promise.all([
    createCategory(uid, { name: "Business", color: "amber" }),
    createCategory(uid, { name: "Learning", color: "sky" }),
    createCategory(uid, { name: "Creative", color: "violet" }),
  ]);

  // Inbox
  const inbox = [
    { content: "I need to improve my daily routine. Mornings feel scattered — maybe a fixed first hour with no phone?", type: "OBSERVATION" as const, tags: ["routine"] },
    { content: "Maybe I should start making content about technical art — breakdowns of shaders and procedural tools.", type: "IDEA" as const, tags: ["content", "techart"] },
    { content: "Why do most small-business apps in Nigeria assume constant internet?", type: "QUESTION" as const, tags: ["business"] },
    { content: "Book recommendation from Tolu: The Mom Test.", tags: ["reading"] },
  ];
  for (const t of inbox) await createThought(uid, t);
  const pinned = await createThought(uid, { content: "Decide by end of month which ONE side project gets my evenings.", type: "TASK", tags: ["focus"] });
  await db.thought.update({ where: { id: pinned.id }, data: { pinned: true } });

  // Idea from a thought (Flow A)
  const heritageThought = await createThought(uid, {
    content: "What if I create a digital heritage experience for Nigerian cities? Walk through Lagos Island and see how it looked in 1900, hear the stories.",
    type: "IDEA",
    tags: ["ar", "heritage"],
  });
  const heritage = await convertThoughtToIdea(uid, heritageThought.id, { title: "Digital heritage walks for Nigerian cities" });
  await updateIdea(uid, heritage.id, {
    summary: "Location-based AR tours that reconstruct historic Lagos and tell its stories.",
    motivation: "Combines my technical art skills with something I care about deeply. Could become a portfolio centrepiece.",
    categoryId: creative.id,
    stage: "EXPLORING",
    priority: "HIGH",
    references: [{ title: "Lagos Island historical maps", url: "https://en.wikipedia.org/wiki/Lagos_Island" }],
  });
  await addIdeaNote(uid, heritage.id, "Talked to a friend at the national museum — they have archival photos that could be licensed. Need to ask about cost.");

  // Evaluated idea that's being pursued (Flow B + C)
  const inventory = await createIdea(uid, {
    title: "Offline-first inventory app for small shops",
    summary: "A simple stock tracker that works without internet and syncs when online.",
    description: "Small shops track stock in notebooks. Existing apps assume reliable internet and are priced for larger businesses.\n\n- Works fully offline\n- WhatsApp-style simplicity\n- Sync when online",
    categoryId: business.id,
    priority: "HIGH",
    tags: ["business", "mobile"],
  });
  const ev1 = await startEvaluation(uid, inventory.id);
  await saveEvaluation(uid, ev1.id, {
    answers: {
      "problem.what": "Shop owners lose track of stock and don't know what's selling.",
      "problem.who": "Small provision stores and pharmacies — my aunt's shop is the first test case.",
      "motivation.why": "I'd like to build something people actually use daily.",
      "feasibility.skills": "I can build the mobile app; sync logic is new to me.",
      "cost.mvp": "Unknown — guess 6–8 weekends for a usable first version.",
      "risks.wrong": "Owners may not change habits from notebooks.",
      "risks.assumptions": "That owners will enter sales consistently. Need to watch someone use it for a week.",
    },
    scores: { personalInterest: 7, potentialImpact: 8, feasibility: 6, skillAlignment: 7, costEfficiency: 8, timeEfficiency: 5, longTermValue: 7 },
    uncertainties: "I haven't validated that owners will enter data consistently.",
  });
  await completeEvaluation(uid, ev1.id);
  await db.evaluation.update({ where: { id: ev1.id }, data: { createdAt: ago(40), completedAt: ago(40) } });
  await recordDecision(uid, inventory.id, { outcome: "RESEARCH_FURTHER", rationale: "Need to watch 3 shop owners work before building anything.", evaluationId: ev1.id, decidedAt: ago(40) });
  const ev2 = await startEvaluation(uid, inventory.id, { copyFromLatest: true });
  await saveEvaluation(uid, ev2.id, {
    answers: { "risks.assumptions": "Observed 3 shops: all wanted a faster way to see low stock. Data entry is the hard part — barcode scanning helps." },
    scores: { feasibility: 7, timeEfficiency: 6, personalInterest: 8 },
  });
  await completeEvaluation(uid, ev2.id);
  await recordDecision(uid, inventory.id, { outcome: "PURSUE", rationale: "The observations confirmed the problem. Start with a 4-week MVP for my aunt's shop.", evaluationId: ev2.id });
  const project = await convertIdeaToProject(uid, inventory.id);
  await updateProject(uid, project.id, { status: "ACTIVE", objective: "A working offline stock tracker used daily in one shop.", expectedOutcome: "My aunt stops using the notebook.", deadline: new Date(Date.now() + 28 * DAY) });
  const m1 = await addMilestone(uid, { projectId: project.id }, { title: "Paper prototype tested in the shop" });
  await addMilestone(uid, { projectId: project.id }, { title: "Offline MVP on her phone", dueDate: new Date(Date.now() + 14 * DAY) });
  await db.milestone.update({ where: { id: m1.id }, data: { done: true } });
  const t1 = await addTask(uid, project.id, { title: "Sketch the 3 core screens" });
  await updateTask(uid, t1.id, { done: true });
  await addTask(uid, project.id, { title: "Choose local database (SQLite vs. IndexedDB)", dueDate: new Date(Date.now() + 2 * DAY) });
  await addTask(uid, project.id, { title: "Build product list + quick sale entry", dueDate: new Date(Date.now() + 7 * DAY) });

  // Revisit later (Flow D)
  const houdini = await createIdea(uid, { title: "Learn Houdini procedural simulations", summary: "Get comfortable with FLIP fluids and pyro for portfolio shots.", categoryId: learning.id, tags: ["techart", "learning"] });
  const ev3 = await startEvaluation(uid, houdini.id);
  await saveEvaluation(uid, ev3.id, { scores: { personalInterest: 9, potentialImpact: 6, feasibility: 7, skillAlignment: 8, costEfficiency: 6, timeEfficiency: 3, longTermValue: 8 } });
  await completeEvaluation(uid, ev3.id);
  await recordDecision(uid, houdini.id, { outcome: "REVISIT_LATER", rationale: "Excited, but the inventory app needs my evenings first. Revisit in two months.", evaluationId: ev3.id, decidedAt: ago(70) });

  // Not worth pursuing
  const crypto = await createIdea(uid, { title: "NFT marketplace for local artists", categoryId: business.id });
  await recordDecision(uid, crypto.id, { outcome: "NOT_WORTH_PURSUING", rationale: "I'm not genuinely interested in the tech, and artists I asked preferred Instagram + direct sales." });

  const aiBiz = await createIdea(uid, { title: "AI-powered assistant for Nigerian businesses", summary: "Very vague right now — needs sharpening.", categoryId: business.id, tags: ["ai", "business"] });
  await db.idea.update({ where: { id: aiBiz.id }, data: { createdAt: ago(6) } });

  // Goals
  const portfolio = await createGoal(uid, { title: "Build a technical art portfolio", kind: "CAREER", whyItMatters: "Opens doors to studios I'd love to work with.", targetDate: new Date(Date.now() + 180 * DAY) });
  await updateGoal(uid, portfolio.id, { progress: 30 });
  await addMilestone(uid, { goalId: portfolio.id }, { title: "Three polished pieces" });
  const fitness = await createGoal(uid, { title: "Run a 10k", kind: "PERSONAL", whyItMatters: "Energy and headspace." });
  await db.goal.update({ where: { id: fitness.id }, data: { updatedAt: ago(45) } });
  const income = await createGoal(uid, { title: "First ₦1m from my own product", kind: "FINANCIAL", whyItMatters: "Proof I can build something people pay for." });

  await createLink(uid, { fromType: "IDEA", fromId: heritage.id, toType: "GOAL", toId: portfolio.id, note: "Would be the centrepiece" });
  await createLink(uid, { fromType: "IDEA", fromId: houdini.id, toType: "GOAL", toId: portfolio.id });
  await createLink(uid, { fromType: "PROJECT", fromId: project.id, toType: "GOAL", toId: income.id });
  await createLink(uid, { fromType: "IDEA", fromId: heritage.id, toType: "IDEA", toId: houdini.id, note: "Both lean on procedural skills" });

  await saveReflection(uid, null, {
    kind: "WEEKLY",
    title: "Week reflection",
    weekOf: new Date(startOfWeek().getTime() - 7 * DAY),
    answers: { progress: "Watched three shop owners use their notebooks. Learned a lot.", next: "Commit to the inventory MVP." },
  });

  console.log("✓ Seeded sample data");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
