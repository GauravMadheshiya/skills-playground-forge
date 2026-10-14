import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

async function callGemini(system: string, contents: { role: 'user' | 'model'; text: string }[], json: boolean): Promise<string> {
  const key = process.env['GEMINI_API_KEY'];
  if (!key) throw new Error('The AI service is not configured yet.');
  let lastError = 'AI service unavailable.';
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
        generationConfig: json ? { responseMimeType: 'application/json', temperature: 0.4 } : { temperature: 0.6 },
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (text) return text;
      lastError = 'The AI returned an empty response.';
      continue;
    }
    const body = await res.text();
    console.error('Gemini error', model, res.status, body.slice(0, 400));
    if (res.status === 401 || res.status === 403) throw new Error('The AI key was rejected. Please check the Gemini API key.');
    if (res.status === 429) throw new Error('The AI is busy right now. Please try again in a minute.');
    lastError = `AI request failed (${res.status}).`;
    if (res.status !== 404) break;
  }
  throw new Error(lastError);
}

/* ---------- Speech to text (Sarvam AI) ---------- */
export const transcribeAudio = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ audio: z.string().min(10).max(14_000_000), mime: z.string().max(80), language: z.string().regex(/^[a-z]{2}-IN$/) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env['SARVAM_AI_API_KEY'];
    if (!key) return { text: '', error: 'Speech service is not configured.' };
    const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
    const ext = data.mime.includes('wav') ? 'wav' : data.mime.includes('ogg') ? 'ogg' : 'webm';
    for (const model of ['saaras:v3', 'saarika:v2.5']) {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: data.mime.split(';')[0] || 'audio/webm' }), `answer.${ext}`);
      form.append('model', model);
      form.append('language_code', data.language);
      const res = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': key }, body: form });
      if (res.ok) {
        const json = (await res.json()) as { transcript?: string };
        if (json.transcript) return { text: json.transcript, error: null };
      } else {
        console.error('Sarvam error', model, res.status, (await res.text()).slice(0, 300));
        if (res.status === 401 || res.status === 403) return { text: '', error: 'Speech key was rejected.' };
      }
    }
    return { text: '', error: 'Could not transcribe this recording.' };
  });

/* ---------- Interview delivery analysis ---------- */
export type InterviewAnalysis = {
  overall: number;
  star: { situation: number; task: number; action: number; result: number; notes: string };
  delivery: { score: number; pace: string; fillers: string[]; notes: string };
  precision: { score: number; notes: string };
  rewrite: string[];
};

export const evaluateInterview = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ question: z.string().max(2000), modelAnswer: z.string().max(3000), answer: z.string().min(5).max(8000), role: z.string().max(120), seconds: z.number().min(0).max(3600).optional() }).parse(d))
  .handler(async ({ data }): Promise<{ result: InterviewAnalysis | null; error: string | null }> => {
    const system = `You are a senior interview coach for Indian and global tech hiring. Evaluate a candidate's spoken or written answer. Return ONLY JSON with this exact shape:
{"overall":0-100,"star":{"situation":0-100,"task":0-100,"action":0-100,"result":0-100,"notes":"2-3 sentences"},"delivery":{"score":0-100,"pace":"short label e.g. 'Balanced ~130 wpm'","fillers":["detected filler words"],"notes":"2-3 sentences on cadence and word economy"},"precision":{"score":0-100,"notes":"2-3 sentences comparing depth to the model answer"},"rewrite":["polished sentence 1","polished sentence 2"]}
The answer may be transcribed from Hinglish or an Indian language; judge the substance fairly.`;
    const user = `Role: ${data.role}\nQuestion: ${data.question}\nModel answer guidance: ${data.modelAnswer}\n${data.seconds ? `Speaking time: ${data.seconds}s\n` : ''}Candidate answer:\n"""${data.answer}"""`;
    try {
      const text = await callGemini(system, [{ role: 'user', text: user }], true);
      const parsed = JSON.parse(text.replace(/^```json|```$/g, '').trim()) as InterviewAnalysis;
      return { result: parsed, error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : 'AI analysis failed.' };
    }
  });

/* ---------- Career assistant chat ---------- */
export const careerChat = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) })).min(1).max(30),
    context: z.string().max(6000),
  }).parse(d))
  .handler(async ({ data }) => {
    const system = `You are SkillBridge AI's Career Assistant — a warm, practical tech career coach. Ground every answer in the user's context below and the SkillBridge role catalog. Use concise markdown (short headings, bullet lists, **bold**). Suggest concrete next steps, projects and SkillBridge pages (/roadmap, /resume, /interview, /soft-skills, /jobs) when useful.\n\nUSER CONTEXT:\n${data.context}`;
    try {
      const reply = await callGemini(system, data.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })), false);
      return { reply, error: null };
    } catch (e) {
      return { reply: '', error: e instanceof Error ? e.message : 'Assistant unavailable.' };
    }
  });
