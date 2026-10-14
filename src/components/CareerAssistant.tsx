import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bot, Check, Copy, Loader2, Send, X, MessageCircle } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { careerChat } from '@/lib/ai.functions';
import { useCareer } from './CareerProvider';
import { getRole, getDomain, SKILLS, roleSkillIds } from '@/data/catalog';
import { analyze } from '@/lib/analysis';

type Msg = { role: 'user' | 'assistant'; content: string };
const CHIPS = ['Review my roadmap gaps', 'How do I answer behavioral questions?', 'Suggest high-impact projects for my resume'];

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith('`') && p.endsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p);
}
function Markdown({ text }: { text: string }) {
  const out: ReactNode[] = []; let list: ReactNode[] = [];
  const flush = () => { if (list.length) { out.push(<ul key={out.length}>{list}</ul>); list = []; } };
  text.split('\n').forEach((line, i) => {
    const l = line.trim();
    if (/^[-*•]\s+/.test(l) || /^\d+\.\s+/.test(l)) { list.push(<li key={i}>{inline(l.replace(/^([-*•]|\d+\.)\s+/, ''))}</li>); return; }
    flush();
    if (!l) return;
    if (/^#{1,4}\s/.test(l)) out.push(<h4 key={i}>{inline(l.replace(/^#+\s/, ''))}</h4>);
    else out.push(<p key={i}>{inline(l)}</p>);
  });
  flush();
  return <div className="chat-md">{out}</div>;
}

export function CareerAssistant() {
  const { progress } = useCareer();
  const chat = useServerFn(careerChat);
  const [open, setOpen] = useState(false), [msgs, setMsgs] = useState<Msg[]>([]), [input, setInput] = useState(''), [loading, setLoading] = useState(false), [unread, setUnread] = useState(1), [copied, setCopied] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading, open]);

  function context() {
    const role = getRole(progress.target);
    if (!role) return 'No target role selected.';
    const a = analyze(role, progress.skills);
    const owned = Object.entries(progress.skills).map(([id, lvl]) => `${SKILLS[id]?.name ?? id} (level ${lvl}/3)`).join(', ') || 'none yet';
    const missing = roleSkillIds(role).filter((id) => !progress.skills[id]).map((id) => SKILLS[id]?.name ?? id).join(', ');
    return `Target role: ${role.title} (domain: ${getDomain(role.domain)?.label ?? role.domain}). Overview: ${role.overview}\nReadiness score: ${a.score}%\nSkills owned: ${owned}\nSkill gaps: ${missing || 'none'}\nCapstone idea: ${role.capstone}\nTrending: ${role.trending.join(', ')}\nSalary bands: junior ${role.salary.junior}, mid ${role.salary.mid}, senior ${role.salary.senior}`;
  }

  async function send(text: string) {
    const t = text.trim(); if (!t || loading) return;
    const next: Msg[] = [...msgs, { role: 'user', content: t }];
    setMsgs(next); setInput(''); setLoading(true);
    try {
      const res = await chat({ data: { messages: next.slice(-20), context: context() } });
      setMsgs((m) => [...m, { role: 'assistant', content: res.reply || `⚠️ ${res.error ?? 'No response.'}` }]);
    } catch { setMsgs((m) => [...m, { role: 'assistant', content: '⚠️ The assistant could not be reached. Please try again.' }]); }
    finally { setLoading(false); if (!open) setUnread((u) => u + 1); }
  }

  return <>
    {open && <section className="assistant-panel" aria-label="Career assistant">
      <header className="assistant-head"><span className="brand-symbol"><Bot size={18} /></span><div><b>Career Assistant</b><span className="muted">Knows your role & skills</span></div><button aria-label="Close assistant" onClick={() => setOpen(false)}><X size={18} /></button></header>
      <div className="assistant-body">
        {msgs.length === 0 && <div className="assistant-welcome"><p>Hi! I can review your skill gaps, suggest projects, or coach you for interviews.</p></div>}
        {msgs.map((m, i) => <div key={i} className={`chat-msg ${m.role}`}>{m.role === 'assistant' ? <><Markdown text={m.content} /><button className="chat-copy" aria-label="Copy reply" onClick={() => { void navigator.clipboard.writeText(m.content); setCopied(i); setTimeout(() => setCopied(null), 1500); }}>{copied === i ? <Check size={13} /> : <Copy size={13} />}</button></> : <p>{m.content}</p>}</div>)}
        {loading && <div className="chat-msg assistant"><Loader2 className="animate-spin" size={16} /> Thinking…</div>}
        <div ref={end} />
      </div>
      <div className="chip-row assistant-chips">{CHIPS.map((c) => <button key={c} className="chip" disabled={loading} onClick={() => void send(c)}>{c}</button>)}</div>
      <form className="assistant-input" onSubmit={(e) => { e.preventDefault(); void send(input); }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your career…" aria-label="Message" /><button type="submit" aria-label="Send" disabled={loading || !input.trim()}><Send size={16} /></button></form>
    </section>}
    <button className="assistant-fab" aria-label={open ? 'Close career assistant' : 'Open career assistant'} onClick={() => { setOpen(!open); setUnread(0); }}>{open ? <X /> : <MessageCircle />}{!open && unread > 0 && <span className="assistant-badge">{unread}</span>}</button>
  </>;
}
