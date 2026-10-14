import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { evaluateInterview, type InterviewAnalysis } from '@/lib/ai.functions';

function Card({ title, score, children }: { title: string; score: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="ai-card"><button className="ai-card-head" onClick={() => setOpen(!open)} aria-expanded={open}><span>{title}</span><b className={score >= 75 ? 'good' : score >= 50 ? 'mid' : 'low'}>{score}</b><ChevronDown size={15} className={open ? 'rot' : ''} /></button>
    <div className="ai-bar"><div style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div>{open && <div className="ai-card-body">{children}</div>}</div>;
}

export function AIInterviewFeedback(props: { question: string; modelAnswer: string; answer: string; role: string; seconds: number }) {
  const run = useServerFn(evaluateInterview);
  const [state, setState] = useState<{ loading: boolean; result: InterviewAnalysis | null; error: string | null }>({ loading: true, result: null, error: null });
  useEffect(() => {
    let live = true;
    run({ data: { ...props, seconds: props.seconds || undefined } })
      .then((r) => live && setState({ loading: false, result: r.result, error: r.error }))
      .catch(() => live && setState({ loading: false, result: null, error: 'AI analysis is unavailable right now.' }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (state.loading) return <div className="ai-feedback"><span className="eyebrow"><Sparkles size={13} /> AI DELIVERY ANALYSIS</span><p className="feedback-note"><Loader2 className="animate-spin inline" size={14} /> Analysing your answer…</p></div>;
  if (!state.result) return <div className="ai-feedback"><span className="eyebrow"><Sparkles size={13} /> AI DELIVERY ANALYSIS</span><p className="feedback-note">{state.error}</p></div>;
  const r = state.result; const s = r.star;
  return <div className="ai-feedback">
    <span className="eyebrow"><Sparkles size={13} /> AI DELIVERY ANALYSIS · {r.overall}/100</span>
    <Card title="STAR breakdown" score={Math.round((s.situation + s.task + s.action + s.result) / 4)}>
      <div className="star-grid">{(['situation', 'task', 'action', 'result'] as const).map((k) => <div key={k}><span>{k[0]!.toUpperCase() + k.slice(1)}</span><b>{s[k]}</b></div>)}</div><p>{s.notes}</p>
    </Card>
    <Card title="Delivery & cadence" score={r.delivery.score}><p><b>Pace:</b> {r.delivery.pace}</p><p><b>Fillers:</b> {r.delivery.fillers.length ? r.delivery.fillers.join(', ') : 'none detected'}</p><p>{r.delivery.notes}</p></Card>
    <Card title="Domain & role precision" score={r.precision.score}><p>{r.precision.notes}</p></Card>
    <div className="ai-rewrite"><b>Polished rewrite</b>{r.rewrite.map((x, i) => <p key={i}>“{x}”</p>)}</div>
  </div>;
}
