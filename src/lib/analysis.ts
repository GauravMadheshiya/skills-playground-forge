import { CATEGORY_HOURS, SKILLS, roleSkillIds, type Category, type Role } from "@/data/catalog";

export type Owned = Record<string, number>; // skillId -> proficiency 1..3

export type Milestone = { id: string; phase: 1 | 2 | 3; title: string; skillId?: string; hours: number; category?: Category };

export function analyze(role: Role, owned: Owned) {
  const all = roleSkillIds(role);
  const have = all.filter((id) => owned[id]);
  const missing = (Object.keys(role.skills) as Category[]).flatMap((c) =>
    role.skills[c].filter((id) => !owned[id]).map((id) => ({ id, category: c })),
  );
  // Core skills weigh double toward readiness.
  const weight = (c: Category) => (c === "core" ? 2 : 1);
  let total = 0, got = 0;
  (Object.keys(role.skills) as Category[]).forEach((c) =>
    role.skills[c].forEach((id) => {
      total += weight(c);
      if (owned[id]) got += weight(c) * (0.6 + 0.2 * (owned[id] - 1));
    }),
  );
  const score = total ? Math.round((got / total) * 100) : 0;
  return { all, have, missing, score };
}

export function buildMilestones(role: Role, owned: Owned): Milestone[] {
  const { missing } = analyze(role, owned);
  const ms: Milestone[] = [];
  missing.forEach(({ id, category }) => {
    const phase = category === "core" ? 1 : 2;
    ms.push({ id: `skill:${id}`, phase, title: `Learn ${(SKILLS[id]?.name ?? id)}`, skillId: id, hours: CATEGORY_HOURS[category], category });
  });
  ms.push({ id: "capstone:build", phase: 3, title: `Capstone: ${role.capstone}`, hours: 60 });
  ms.push({ id: "capstone:deploy", phase: 3, title: "Deploy, write a README and publish a case study", hours: 10 });
  ms.push({ id: "capstone:apply", phase: 3, title: `Polish resume and apply to 10 ${role.title} roles`, hours: 8 });
  return ms;
}

export const PHASES = {
  1: { title: "Phase 1 · Immediate Gap Fillers", blurb: "Missing core skills for minimum hireability." },
  2: { title: "Phase 2 · Deep Dives & Best Practices", blurb: "Frameworks, tooling and professional practices." },
  3: { title: "Phase 3 · Real-World Capstone & Deployment", blurb: "Prove it with a portfolio project." },
} as const;

export const weeks = (h: number) => Math.max(1, Math.round(h / 10));

export function projectIdeas(role: Role, owned: Owned) {
  const missing = analyze(role, owned).missing.map((m) => (SKILLS[m.id]?.name ?? m.id));
  const pick = (i: number, n: number) => missing.slice(i, i + n);
  const ideas = [
    { skills: pick(0, 2), title: `Mini ${role.title} toolkit`, brief: "A focused utility that forces you to use these skills in a real, shippable tool with tests and docs." },
    { skills: pick(2, 3), title: "Production-style service", brief: "Build a small product with a real data model, deploy it publicly and document the architecture decisions." },
    { skills: pick(5, 3), title: "Open-source contribution sprint", brief: "Find 2–3 good-first-issues in projects that use these technologies and land merged pull requests." },
  ].filter((p) => p.skills.length);
  if (!ideas.length) ideas.push({ skills: [], title: "Advanced capstone", brief: role.capstone });
  return ideas.map((p) => ({ ...p, title: p.skills.length ? `Missing ${p.skills.join(" & ")}? ${p.title}` : p.title }));
}

const Q_TEMPLATES = [
  (s: string) => [`Explain the core concepts of ${s} to a junior teammate.`, `Start with the problem ${s} solves, then cover its key building blocks, a concrete example from your work, and common pitfalls.`],
  (s: string) => [`Describe a time you used ${s} to solve a real problem.`, `Use STAR: situation, task, the specific ${s} decisions you made, and a measurable result.`],
  (s: string) => [`What are the trade-offs and limitations of ${s}?`, `Strong answers compare ${s} with alternatives, cite performance/complexity costs, and say when you would NOT use it.`],
  (s: string) => [`How would you debug a production issue involving ${s}?`, `Reproduce, observe (logs/metrics), form hypotheses, isolate, fix, then add a test or alert so it does not recur.`],
];

export function interviewQuestions(role: Role, owned: Owned) {
  const ids = roleSkillIds(role);
  const known = ids.filter((id) => owned[id]);
  const learning = ids.filter((id) => !owned[id]);
  const pool = [...known, ...learning].slice(0, 10);
  return pool.map((id, i) => {
    const template = Q_TEMPLATES[i % Q_TEMPLATES.length];
    const [q, a] = template ? template(SKILLS[id]?.name ?? id) : ["Describe your experience.", "Use a concrete example."];
    return { id, q, a, known: !!owned[id] };
  });
}

export function roadmapMarkdown(role: Role, owned: Owned, done: string[]) {
  const ms = buildMilestones(role, owned);
  const { score, have } = analyze(role, owned);
  let md = `# ${role.title} Roadmap\n\nReadiness: ${score}%\n\n**Skills I have:** ${have.map((i) => (SKILLS[i]?.name ?? i)).join(", ") || "none yet"}\n`;
  ([1, 2, 3] as const).forEach((p) => {
    md += `\n## ${PHASES[p].title}\n`;
    ms.filter((m) => m.phase === p).forEach((m) => (md += `- [${done.includes(m.id) ? "x" : " "}] ${m.title} (~${m.hours}h)\n`));
  });
  return md;
}
