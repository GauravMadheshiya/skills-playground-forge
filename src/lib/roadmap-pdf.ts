import { CATEGORY_LABEL, SKILLS, getDomain, resourcesFor, type Role } from '@/data/catalog';
import { analyze, buildMilestones, PHASES, weeks, type Owned } from './analysis';

type RGB = [number, number, number];

// Read the fixed print palette from the shared design system, not the screen theme.
function printColor(token: string): RGB {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PDF colors could not be prepared');
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
}

export async function createRoadmapPDF(role: Role, owned: Owned, done: string[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const ink = printColor('--pdf-ink'), muted = printColor('--pdf-muted');
  const paper = printColor('--pdf-paper'), surface = printColor('--pdf-surface');
  const accent = printColor('--pdf-accent'), white = printColor('--pdf-white');
  const line = printColor('--pdf-line'), gold = printColor('--pdf-gold');
  const { score, have } = analyze(role, owned);
  const milestones = buildMilestones(role, owned);
  const completed = milestones.filter(m => done.includes(m.id)).length;
  const hours = milestones.filter(m => !done.includes(m.id)).reduce((sum, m) => sum + m.hours, 0);
  const clean = (value: string) => value.replace(/[–—→]/g, '-').replace(/·/g, '/').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  let y = 0;
  function text(value: string, x: number, top: number, size = 10, color: RGB = ink, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size); doc.setTextColor(...color); doc.text(clean(value), x, top);
  }
  function paragraph(value: string, x: number, top: number, width: number, size = 10, color: RGB = muted) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(clean(value), width);
    doc.setTextColor(...color); doc.text(lines, x, top, { lineHeightFactor: 1.45 });
    return lines.length * size * 0.3528 * 1.45;
  }
  function background() {
    doc.setFillColor(...paper); doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(...accent); doc.rect(0, 0, 210, 2, 'F');
    text('skillbridge AI', 18, 15, 11, ink, true);
    text('PERSONAL CAREER ROADMAP', 122, 15, 8, muted);
    doc.setDrawColor(...line); doc.line(18, 21, 192, 21);
  }
  function page() { doc.addPage(); background(); y = 35; }
  function section(label: string, title: string, description: string) {
    text(label, 18, y, 9, accent, true); y += 12;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(23);
    const lines: string[] = doc.splitTextToSize(clean(title), 170);
    doc.setTextColor(...ink); doc.text(lines, 18, y); y += lines.length * 9 + 4;
    y += paragraph(description, 18, y, 170) + 10;
  }
  background();
  doc.setFillColor(...ink); doc.roundedRect(18, 32, 174, 91, 3, 3, 'F');
  text('YOUR NEXT CHAPTER', 27, 47, 9, gold, true);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(29);
  const title: string[] = doc.splitTextToSize(clean(role.title), 154);
  doc.setTextColor(...white); doc.text(title, 27, 64, { lineHeightFactor: 1.12 });
  text(getDomain(role.domain)?.label ?? 'Technology career', 27, 111, 10, white);
  text('PERSONALIZED FROM YOUR SKILL ASSESSMENT', 18, 136, 8, accent, true);
  const metrics = [
    { value: `${score}%`, label: 'CAREER READINESS' },
    { value: `${completed} / ${milestones.length}`, label: 'MILESTONES COMPLETE' },
    { value: `~${weeks(hours)} weeks`, label: 'AT 10 HOURS / WEEK' },
  ];
  metrics.forEach((metric, i) => {
    const x = 18 + i * 59;
    doc.setFillColor(...surface); doc.roundedRect(x, 144, 56, 31, 2, 2, 'F');
    text(metric.value, x + 5, 157, 17, accent, true);
    text(metric.label, x + 5, 167, 6.7, muted, true);
  });
  text('Your path at a glance', 18, 192, 16, ink, true);
  (['Build your foundation', 'Deepen your expertise', 'Ship your capstone'] as const).forEach((label, i) => {
    const top = 206 + i * 18;
    doc.setFillColor(...accent); doc.circle(23, top - 1, 4.5, 'F');
    text(String(i + 1), 21.9, top + 0.5, 9, white, true);
    text(label, 33, top, 11, ink, true);
    text(`${milestones.filter(m => m.phase === i + 1).length} milestones`, 151, top, 9, muted);
  });
  paragraph('A living plan, not a hiring guarantee. Time estimates reflect remaining milestones; update your skill assessment as you learn.', 18, 264, 174, 9);

  ([1, 2, 3] as const).forEach(phase => {
    page();
    section(`PHASE 0${phase}`, PHASES[phase].title.split(' · ')[1] ?? PHASES[phase].title, PHASES[phase].blurb);
    const items = milestones.filter(m => m.phase === phase);
    if (!items.length) paragraph('All skills in this phase are already in your toolkit. Continue to the next phase.', 18, y, 174);
    items.forEach(m => {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      const titleLines: string[] = doc.splitTextToSize(clean(m.title), 130);
      const detail = m.skillId ? SKILLS[m.skillId]?.why ?? '' : 'Turn your learning into portfolio evidence.';
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      const detailLines: string[] = doc.splitTextToSize(clean(detail), 157);
      const height = 15 + titleLines.length * 4.6 + detailLines.length * 4.6 + (m.skillId ? 10 : 0);
      if (y + height > 275) {
        page(); text(`PHASE 0${phase} / CONTINUED`, 18, y, 9, accent, true); y += 13;
      }
      doc.setFillColor(...surface); doc.roundedRect(18, y, 174, height, 2, 2, 'F');
      doc.setDrawColor(...accent); doc.setLineWidth(0.4); doc.roundedRect(23, y + 6, 4, 4, 0.6, 0.6, 'S');
      if (done.includes(m.id)) { doc.line(23.7, y + 8, 25, y + 9.1); doc.line(25, y + 9.1, 26.5, y + 6.7); }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink); doc.text(titleLines, 31, y + 9);
      text(`${m.hours}h`, 179, y + 9, 9, accent, true);
      const detailY = y + 11 + titleLines.length * 4.6;
      paragraph(detail, 31, detailY, 157, 9);
      const statusY = detailY + detailLines.length * 4.6 + 3;
      text(`${done.includes(m.id) ? 'COMPLETED' : 'TO DO'}${m.category ? `  /  ${CATEGORY_LABEL[m.category]}` : ''}`, 31, statusY, 7, accent, true);
      if (m.skillId) {
        const resources = resourcesFor(m.skillId);
        (['youtube', 'free', 'paid', 'other'] as const).forEach((category, i) => {
          const resource = resources.find(r => r.category === category);
          if (!resource) return;
          const labels = ['YouTube', 'Free platforms', 'Paid platforms', 'Other resources'];
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...accent);
          doc.textWithLink(labels[i] ?? category, 31 + i * 39, statusY + 8, { url: resource.url });
        });
      }
      y += height + 5;
    });
  });
  page(); section('MAKE IT REAL', 'Your capstone blueprint', role.capstone);
  ['Define the user problem and measurable success criteria.', 'Design the architecture and break the build into weekly milestones.', 'Implement, test, and deploy a working version.', 'Publish your repository, demo, and a case study with trade-offs and results.'].forEach((step, i) => {
    text(`0${i + 1}`, 18, y, 13, accent, true);
    y += paragraph(step, 32, y, 157, 11, ink) + 12;
  });
  y += 5; text('Skills already in your toolkit', 18, y, 15, ink, true); y += 10;
  const toolkit = have.map(id => `${SKILLS[id]?.name ?? id} (${['', 'Beginner', 'Intermediate', 'Advanced'][owned[id] ?? 0] ?? ''})`).join(' / ') || 'Your toolkit starts with your first assessment.';
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const toolkitLines: string[] = doc.splitTextToSize(clean(toolkit), 174);
  toolkitLines.forEach(value => { if (y > 273) { page(); } text(value, 18, y, 9, muted); y += 5; });
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i); doc.setDrawColor(...line); doc.line(18, 283, 192, 283);
    text('SkillBridge AI / Your personalized learning journey', 18, 290, 8, muted);
    text(`${i} / ${count}`, 181, 290, 8, muted);
  }
  doc.setProperties({ title: `${role.title} - Personalized Roadmap`, author: 'SkillBridge AI', subject: 'Skill gaps, milestones, learning links and capstone blueprint' });
  return doc.output('blob');
}