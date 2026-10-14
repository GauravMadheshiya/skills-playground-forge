import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowRight, ChevronDown, RotateCcw, Sparkles, Target } from 'lucide-react';
import { PageHeading, Gauge } from '@/components/CareerUI';
import { Button } from '@/components/ui/button';
import { VoiceRecorder, LanguageSelect } from '@/components/VoiceRecorder';
import { CHALLENGES, SOFT_MODULES, scoreSoftSkill } from '@/lib/soft-skills';

export const Route = createFileRoute('/soft-skills')({
  head: () => ({ meta: [
    { title: 'Soft Skills Hub — SkillBridge AI' },
    { name: 'description', content: 'Practice verbal fluency, storytelling, executive presence and difficult conversations with an instant-feedback simulator.' },
    { property: 'og:title', content: 'Soft Skills Hub — SkillBridge AI' },
    { property: 'og:description', content: 'Speak clearly, tell better stories and lead tough conversations.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: SoftSkills,
});

function SoftSkills() {
  const [open, setOpen] = useState<string>(SOFT_MODULES[0]!.id);
  const [challenge, setChallenge] = useState(CHALLENGES[0]!.id);
  const [text, setText] = useState(''), [lang, setLang] = useState('en-IN'), [submitted, setSubmitted] = useState(false);
  const c = CHALLENGES.find((x) => x.id === challenge)!;
  const result = scoreSoftSkill(text);
  function pick(id: string) { setChallenge(id); setText(''); setSubmitted(false); document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth' }); }

  return <main className="page">
    <PageHeading eyebrow="COMMUNICATE WITH IMPACT" title="Soft skills that get you hired — and promoted." description="Four practical modules and a practice simulator with instant structural feedback." />
    <section className="soft-modules">
      {SOFT_MODULES.map((m, i) => <article key={m.id} className={`soft-module ${open === m.id ? 'is-open' : ''}`}>
        <button className="soft-module-head" onClick={() => setOpen(open === m.id ? '' : m.id)} aria-expanded={open === m.id}>
          <span className="soft-index">0{i + 1}</span><span><h3>{m.title}</h3><p className="muted">{m.summary}</p></span><ChevronDown className="soft-chevron" />
        </button>
        {open === m.id && <div className="soft-module-body">
          {m.lessons.map((l) => <div key={l.title} className="soft-lesson"><b>{l.title}</b><p>{l.body}</p></div>)}
          <div className="soft-drill"><Target size={16} /><span><b>Drill:</b> {m.drill}</span></div>
        </div>}
      </article>)}
    </section>

    <section id="simulator" className="hub-grid soft-sim">
      <section>
        <div className="eyebrow"><Sparkles size={13} /> PRACTICE SIMULATOR</div>
        <div className="chip-row">{CHALLENGES.map((x) => <button key={x.id} className={`chip ${x.id === challenge ? 'chip-active' : ''}`} onClick={() => pick(x.id)}>{x.title}</button>)}</div>
        <div className="question-card"><span className="eyebrow">CHALLENGE</span><h2>{c.title}</h2><p className="feedback-note">Tip: {c.tip}</p></div>
        <div className="answer-tools"><label htmlFor="soft-answer" className="field-label">Your response</label><div className="answer-tools-right"><LanguageSelect value={lang} onChange={setLang} /><VoiceRecorder language={lang} base={text} onText={setText} disabled={submitted} /></div></div>
        <textarea id="soft-answer" rows={8} value={text} disabled={submitted} onChange={(e) => setText(e.target.value)} placeholder="Type or record your response…" />
        <div className="question-controls"><span>{result.words} words</span>{submitted ? <Button onClick={() => { setText(''); setSubmitted(false); }}><RotateCcw /> Try again</Button> : <Button disabled={result.words < 5} onClick={() => setSubmitted(true)}>Score my response <ArrowRight /></Button>}</div>
      </section>
      <aside className="results-panel">
        <span className="eyebrow">STRUCTURAL SCORE</span>
        <Gauge value={submitted ? result.score : 0} label="COMMUNICATION SCORE" />
        <div className="rubric-list">{result.rubric.map((r) => <div key={r.name} className={`rubric-row ${submitted ? (r.ok ? 'ok' : 'miss') : ''}`}><span>{r.name}</span><b>{submitted ? (r.ok ? '✓' : '—') : '·'}</b></div>)}</div>
        {submitted ? <>
          {result.fillers.length > 0 && <p className="feedback-note">Fillers detected: {result.fillers.join(', ')}</p>}
          {result.rubric.filter((r) => !r.ok).map((r) => <p key={r.name} className="feedback-note">{r.tip}</p>)}
          {result.rubric.every((r) => r.ok) && <p className="feedback-note">Excellent — clear, structured and actionable.</p>}
        </> : <p className="feedback-note">Submit a response to see your rubric.</p>}
      </aside>
    </section>
  </main>;
}
