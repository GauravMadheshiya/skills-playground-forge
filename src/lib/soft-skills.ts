export type SoftModule = { id: string; title: string; summary: string; lessons: { title: string; body: string }[]; drill: string };

export const SOFT_MODULES: SoftModule[] = [
  { id: 'fluency', title: 'Verbal Fluency & Clarity', summary: 'Drop filler words, control your cadence and structure thoughts under pressure.', lessons: [
    { title: 'Replace fillers with pauses', body: 'When you feel "um", "like" or "basically" coming, close your mouth and pause for one beat. Silence reads as confidence; fillers read as uncertainty.' },
    { title: 'Control cadence', body: 'Aim for ~130–150 words per minute. Slow down on numbers and key claims; speed up slightly on context.' },
    { title: 'Signpost your thoughts', body: 'Open with structure: "There are two reasons…", "First… Second…". Listeners relax when they know the shape of your answer.' },
  ], drill: 'Describe your current project in 45 seconds without a single filler word.' },
  { id: 'story', title: 'The Art of Storytelling', summary: 'Use STAR and PREP templates to turn experience into memorable stories.', lessons: [
    { title: 'STAR template', body: 'Situation: "At X, our checkout failed 8% of the time." Task: "I owned fixing it before the sale." Action: "I traced, added retries, load-tested." Result: "Failures dropped to 0.4%, +₹12L revenue."' },
    { title: 'PREP template', body: 'Point: state your view. Reason: why. Example: one concrete proof. Point: restate it. Ideal for opinions and "what would you do" questions.' },
    { title: 'Make results measurable', body: 'Every story ends with a number, a decision, or a lesson. "It went well" is not a result.' },
  ], drill: 'Tell a STAR story about a time you fixed something broken.' },
  { id: 'presence', title: 'Executive Presence & Active Listening', summary: 'Confident posture, calm question handling and phrasing that signals leadership.', lessons: [
    { title: 'Answer first, then explain', body: 'Leaders give the headline first: "Yes, we can ship Friday — with one risk." Then supporting detail.' },
    { title: 'Listen to understand', body: 'Paraphrase before responding: "So the concern is cost, not timeline?" It shows respect and prevents wasted answers.' },
    { title: 'Own the room physically', body: 'Feet grounded, shoulders open, steady eye contact (or camera). Drop hedges like "I just think" and "sort of".' },
  ], drill: 'Give a 30-second status update to a VP who has only one minute.' },
  { id: 'conversations', title: 'Cross-Functional & Difficult Conversations', summary: 'Constructive feedback, diplomatic disagreement and stakeholder negotiation.', lessons: [
    { title: 'SBI feedback script', body: 'Situation – Behavior – Impact: "In yesterday\'s standup (S), the API change wasn\'t mentioned (B), so QA tested the old flow for 3 hours (I). Can we flag changes earlier?"' },
    { title: 'Disagree and commit', body: '"I see it differently because… If we go ahead, I\'ll fully support it — can we add a checkpoint after week one?"' },
    { title: 'Negotiate on options, not positions', body: 'Offer trade-offs: "We can hit the date with scope A, or deliver everything two weeks later. Which matters more?"' },
  ], drill: 'Push back on a product manager adding scope mid-sprint.' },
];

export const CHALLENGES = [
  { id: 'tech-debt', title: 'Explain technical debt to an executive in 60 seconds', module: 'presence', tip: 'Use a business analogy, quantify the cost, end with a clear ask.' },
  { id: 'say-no', title: "Say 'no' to an unrealistic project deadline diplomatically", module: 'conversations', tip: 'Acknowledge the goal, explain the risk with facts, offer two alternatives.' },
  { id: 'failure', title: 'Tell me about a time you failed', module: 'story', tip: 'Use STAR, own the mistake, end with what changed afterwards.' },
  { id: 'feedback', title: 'Give feedback to a teammate who keeps missing code reviews', module: 'conversations', tip: 'Use SBI and invite their perspective.' },
  { id: 'intro', title: 'Introduce yourself in 45 seconds at a client meeting', module: 'fluency', tip: 'Who you are, what you do, why it matters to them.' },
];

export const FILLERS = ['um', 'uh', 'like', 'basically', 'actually', 'literally', 'you know', 'sort of', 'kind of', 'i mean', 'so yeah'];

export function scoreSoftSkill(text: string) {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\u0900-\u0dff ]/g, ' ')} `;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const fillers = FILLERS.flatMap((f) => { const n = t.split(` ${f} `).length - 1; return n ? [`${f} ×${n}`] : []; });
  const fillerCount = fillers.reduce((s, f) => s + Number(f.split('×')[1]), 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length || 1;
  const avg = words / sentences;
  const rubric = [
    { name: 'Clear opening', ok: /^(\s*)(yes|no|in short|the short answer|my recommendation|i recommend|i'd|i would|there are|first|simply put|i am|i'm|hi)/i.test(text), tip: 'Lead with your headline or recommendation in the first sentence.' },
    { name: 'Structure', ok: /\b(first|second|then|finally|because|so that|which means|as a result)\b/i.test(text), tip: 'Add signposts like "first", "because", "as a result".' },
    { name: 'Concrete evidence', ok: /\d|%|percent|example|for instance|for example/i.test(text), tip: 'Include a number or a concrete example.' },
    { name: 'Clear ask / close', ok: /\b(propose|suggest|recommend|can we|could we|next step|let's|would you|ask)\b/i.test(text), tip: 'Close with a proposal, next step or question.' },
    { name: 'Low filler use', ok: fillerCount <= 1, tip: 'Replace fillers with a short pause.' },
    { name: 'Concise sentences', ok: avg <= 24 && words >= 25, tip: words < 25 ? 'Develop your answer to at least 25 words.' : 'Shorten long sentences to under ~24 words.' },
  ];
  const score = Math.round((rubric.filter((r) => r.ok).length / rubric.length) * 100);
  return { score, words, fillers, rubric };
}
