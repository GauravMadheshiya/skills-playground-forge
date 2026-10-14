import { SKILLS, roleSkillIds, type Role } from '@/data/catalog';
import type { Owned } from './analysis';
export type ProgressData = { skills: Owned; milestones: Record<string, string[]>; target: string };
export const emptyProgress: ProgressData = { skills: {}, milestones: {}, target: 'full-stack' };
export function mergeProgress(account: ProgressData, guest: ProgressData): ProgressData {
  const skills = { ...account.skills };
  for (const [id, level] of Object.entries(guest.skills)) skills[id] = Math.max(skills[id] ?? 0, level);
  const milestones = { ...account.milestones };
  for (const [role, done] of Object.entries(guest.milestones)) milestones[role] = [...new Set([...(milestones[role] ?? []), ...done])];
  return { skills, milestones, target: guest.target || account.target || 'full-stack' };
}
export function resumeAlignment(role: Role, text: string) {
  const lower = text.toLowerCase();
  const matched: string[] = [], missing: string[] = [];
  for (const id of roleSkillIds(role)) {
    const name = SKILLS[id]?.name ?? id;
    const aliases = [name, id.replaceAll('_', ' '), ...name.split(/\s*[(/,&]\s*/)].filter(x => x.length > 1).map(x => x.replace(/[()]/g, '').trim().toLowerCase());
    const found = aliases.some(alias => new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i').test(lower));
    (found ? matched : missing).push(name);
  }
  return { matched, missing, score: Math.round(matched.length / Math.max(1, matched.length + missing.length) * 100) };
}
export function scoreAnswer(answer: string) {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const dimensions = [
    { name: 'Situation', value: /\b(when|while|project|team|company|context|situation)\b/i.test(answer) ? 25 : 0 },
    { name: 'Task', value: /\b(task|goal|needed|responsible|challenge|objective|had to)\b/i.test(answer) ? 25 : 0 },
    { name: 'Action', value: /\b(I|we)\b.*\b(built|implemented|designed|created|tested|analyzed|led|used|developed|optimized)\b/is.test(answer) ? 25 : 0 },
    { name: 'Result', value: /\b(result|improved|reduced|increased|achieved|delivered|learned)\b/i.test(answer) && /\d|percent|measur|impact/i.test(answer) ? 25 : 0 },
  ];
  return { dimensions, score: words < 20 ? Math.min(25, dimensions.reduce((s,d) => s+d.value,0)) : dimensions.reduce((s,d) => s+d.value,0), words };
}
export const STUDENTS = [
  { name: 'Alex · Frontend student', target: 'frontend', skills: { html: 3, css: 3, javascript: 2, react: 2, git: 2, typescript: 1, problem_solving: 2 } },
  { name: 'Priya · Aspiring ML engineer', target: 'ml-engineer', skills: { python: 3, stats: 2, sql: 2, pandas: 2, ml: 1, git: 2 } },
  { name: 'Sam · Cloud explorer', target: 'cloud-architect', skills: { linux: 2, networking: 2, aws: 1, docker: 1, git: 2 } },
];
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=filename; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
}
