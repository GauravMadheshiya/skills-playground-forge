import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { transcribeAudio } from '@/lib/ai.functions';

export const INDIAN_LANGUAGES = [
  { code: 'en-IN', label: 'English (Indian accent)' },
  { code: 'hi-IN', label: 'Hindi (हिंदी / Hinglish)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
  { code: 'bn-IN', label: 'Bengali (বাংলা)' },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'od-IN', label: 'Odia (ଓଡ଼ିଆ)' },
] as const;

type SR = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: (() => void) | null };

function toBase64(buf: ArrayBuffer) {
  let s = ''; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

export function LanguageSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <select className="role-select lang-select" aria-label="Speaking language" value={value} onChange={(e) => onChange(e.target.value)}>{INDIAN_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>;
}

/** Records speech: live browser transcription while speaking, then a Sarvam AI transcript replaces it on stop. */
export function VoiceRecorder({ language, base, onText, onDuration, disabled }: { language: string; base: string; onText: (t: string) => void; onDuration?: (s: number) => void; disabled?: boolean }) {
  const transcribe = useServerFn(transcribeAudio);
  const [recording, setRecording] = useState(false), [busy, setBusy] = useState(false), [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null), sr = useRef<SR | null>(null), chunks = useRef<Blob[]>([]), timer = useRef<number | null>(null), start = useRef(0), prefix = useRef('');

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); rec.current?.stream.getTracks().forEach((t) => t.stop()); sr.current?.stop(); }, []);

  async function begin() {
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast.error('Microphone access was blocked. Allow it in your browser to record.'); return; }
    prefix.current = base.trim() ? base.trim() + ' ' : '';
    chunks.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    mr.onstop = () => void finish(mr.mimeType);
    mr.start(); rec.current = mr;
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (Ctor) {
      const r = new Ctor(); r.lang = language === 'od-IN' ? 'or-IN' : language; r.continuous = true; r.interimResults = true;
      r.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i]![0]!.transcript; onText(prefix.current + t); };
      r.onerror = () => {}; try { r.start(); sr.current = r; } catch { /* ignore */ }
    }
    start.current = Date.now(); setSecs(0); setRecording(true);
    timer.current = window.setInterval(() => setSecs(Math.round((Date.now() - start.current) / 1000)), 500);
  }

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    const d = Math.round((Date.now() - start.current) / 1000); onDuration?.(d);
    sr.current?.stop(); sr.current = null;
    rec.current?.stop(); rec.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }

  async function finish(mime: string) {
    const blob = new Blob(chunks.current, { type: mime || 'audio/webm' });
    if (blob.size < 2000) return;
    // The speech service only accepts clips up to 30 seconds.
    if (blob.size > 10_000_000 || Date.now() - start.current > 29_000) { toast.message('Recording is longer than 30 seconds — kept the live transcript.'); return; }
    setBusy(true);
    try {
      const res = await transcribe({ data: { audio: toBase64(await blob.arrayBuffer()), mime: blob.type, language } });
      if (res.text) onText(prefix.current + res.text);
      else if (res.error) toast.message(`${res.error} Kept the live transcript.`);
    } catch { toast.message('Speech service is slow — kept the live transcript.'); }
    finally { setBusy(false); }
  }

  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return <div className="voice-recorder">
    {recording ? <Button type="button" variant="destructive" onClick={stop}><span className="rec-pulse" /><Square /> Stop · {mm}</Button>
      : <Button type="button" variant="outline" disabled={disabled || busy} onClick={begin}>{busy ? <><Loader2 className="animate-spin" /> Transcribing…</> : <><Mic /> Record answer</>}</Button>}
  </div>;
}
