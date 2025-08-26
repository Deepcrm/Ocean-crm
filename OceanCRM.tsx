
'use client';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Play, Save, Bot, MapPin, Phone, Users, Building2, BadgeDollarSign, ChevronRight, Trash2 } from "lucide-react";

/**
 * Ocean CRM (LocalStorage edition)
 * - Leads, Kanban tasks, and Voice Notes persist to localStorage
 * - Voice audio is stored as base64 in localStorage (prototype/demo only)
 * - Full UI similar to previous version, now with CRUD & persistence
 */

const theme = {
  bg: "#eef5f7",
  surface: "#f2f7f9",
  navy: "#0f344b",
  teal: "#22b3b8",
  tealDark: "#12949b",
  blue: "#2b5b7a",
  chip: "#d9eef0",
};

function Card({ children, className = "", style = {} }: any) {
  return <div className={`rounded-2xl shadow-lg border-0 ${className}`} style={style}>{children}</div>;
}
function CardHeader({ children, className="" }: any) {
  return <div className={`p-4 pb-2 ${className}`}>{children}</div>;
}
function CardTitle({ children, className="" }: any) {
  return <h3 className={`font-semibold ${className}`}>{children}</h3>;
}
function CardContent({ children, className="" }: any) {
  return <div className={`p-4 pt-2 ${className}`}>{children}</div>;
}
function Button({ children, onClick, className="", disabled=false, variant="primary" }: any) {
  const base = "inline-flex items-center px-4 py-2 rounded-2xl text-sm transition";
  let style = "bg-slate-900 text-white hover:opacity-90";
  if (variant==="secondary") style = "bg-white text-slate-900 shadow hover:bg-white/90";
  if (variant==="ghost") style = "text-slate-600 hover:bg-slate-100";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${style} ${className}`}>{children}</button>;
}
function Input(props:any){ return <input {...props} className={`px-3 py-2 rounded-2xl border bg-white text-sm ${props.className||""}`} /> }
function Textarea(props:any){ return <textarea {...props} className={`px-3 py-2 rounded-2xl border bg-white text-sm w-full ${props.className||""}`} /> }

function kpiCard(title: string, value: string | number, icon?: React.ReactNode, accent?: string) {
  return (
    <Card style={{ background: theme.surface }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-slate-500">{title}</CardTitle>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold" style={{ color: accent ?? theme.navy }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- LocalStorage helpers ---------- */
const LS_KEYS = {
  LEADS: "oceancrm:leads",
  TASKS: "oceancrm:tasks",
  VOICES: "oceancrm:voices"
};

function readJSON(key: string, fallback: any) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function writeJSON(key: string, v: any) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch (e) {
    console.error("localStorage write failed", e);
  }
}

async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string) || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ---------- Recorder with local persistence ---------- */
function useRecorder() {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState<BlobPart[]>([]);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then(() => setPermission(true))
      .catch(() => setPermission(false));
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermission(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRef.current = recorder;
    setChunks([]);
    setElapsed(0);
    recorder.ondataavailable = (e) => setChunks((p) => [...p, e.data]);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setAudioURL(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    setRecording(true);
    timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
  };

  const reset = () => {
    setChunks([]);
    setAudioURL(null);
    setElapsed(0);
  };

  const blob = useMemo(() => (chunks.length ? new Blob(chunks, { type: "audio/webm" }) : null), [chunks]);
  return { permission, recording, start, stop, audioURL, blob, reset, elapsed };
}

/* ---------- VoiceNotes component (persists notes to localStorage) ---------- */
function VoiceNoteWidget({ onNew }: { onNew?: (note:any)=>void }) {
  const { permission, recording, start, stop, audioURL, blob, reset, elapsed } = useRecorder();
  const [player, setPlayer] = useState<HTMLAudioElement | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!audioURL) return;
    const a = new Audio(audioURL);
    setPlayer(a);
    return () => a.pause();
  }, [audioURL]);

  const saveToLocal = async () => {
    if (!blob) return;
    setSaving(true);
    try {
      const base64 = await blobToBase64(blob);
      const voices = readJSON(LS_KEYS.VOICES, []);
      const id = `v_${Date.now()}`;
      const note = { id, label: `Voice ${voices.length+1}`, data: base64, duration: elapsed, createdAt: Date.now() };
      voices.unshift(note);
      writeJSON(LS_KEYS.VOICES, voices);
      if (onNew) onNew(note);
      reset();
      alert("Voice note saved locally ✅");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    }
    setSaving(false);
  };

  return (
    <Card className="shadow-xl border-0" style={{ background: `linear-gradient(135deg, ${theme.navy}, ${theme.blue})` }}>
      <CardHeader>
        <CardTitle className="text-white">Voice Notes</CardTitle>
      </CardHeader>
      <CardContent>
        {permission === false && (
          <div className="text-white/90 text-sm mb-3">Microphone not available. Allow mic access in your browser settings.</div>
        )}

        <div className="flex items-center gap-3">
          {!recording ? (
            <Button onClick={start} className="rounded-2xl" variant="secondary">
              <Mic className="mr-2 h-4 w-4" /> Record
            </Button>
          ) : (
            <Button onClick={stop} className="rounded-2xl bg-white text-slate-900 hover:bg-white/90">
              <Square className="mr-2 h-4 w-4" /> Stop
            </Button>
          )}

          <div className="text-white/90 text-sm">{new Date(elapsed * 1000).toISOString().substring(14, 19)}</div>

          {audioURL && (
            <>
              <Button onClick={() => player?.play()} className="rounded-2xl" variant="secondary">
                <Play className="mr-2 h-4 w-4" /> Play
              </Button>
              <a
                href={audioURL}
                download={`voice-note-${Date.now()}.webm`}
                className="inline-flex items-center rounded-2xl px-3 py-2 text-sm bg-white text-slate-900 shadow hover:opacity-90"
              >
                <Save className="mr-2 h-4 w-4" /> Download
              </a>
              <Button variant="ghost" className="text-white/80 hover:text-white" onClick={saveToLocal} disabled={saving}>
                {saving ? "Saving…" : "Save Locally"}
              </Button>
              <Button variant="ghost" className="text-white/80 hover:text-white" onClick={reset}>
                Reset
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- AIAssistant (mock) ---------- */
function AIAssistant({ leads }: { leads:any[] }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "Hi! I can summarize calls, qualify leads, and draft follow-ups." },
  ]);

  const send = async () => {
    if (!query.trim()) return;
    setMessages((m) => [...m, { role: "user", content: query }]);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    // Make a simple mock reply that can reference lead count
    const canned = `Suggested reply based on ${leads.length} saved leads:
- Thanks for connecting! I recommend 2 options.
Actions:
1) Tag lead as 'Hot'.
2) Schedule site visit.
3) Create follow-up task for tomorrow.`;
    setMessages((m) => [...m, { role: "assistant", content: canned }]);
    setLoading(false);
    setQuery("");
  };

  return (
    <Card style={{ background: theme.surface }}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl p-2" style={{ background: theme.chip }}>
            <Bot />
          </div>
          <CardTitle className="text-slate-700">AI Assistant</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 overflow-y-auto rounded-xl p-3 bg-white/70 border border-white shadow-inner">
          {messages.map((m, i) => (
            <div key={i} className={`mb-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div className={`inline-block rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-teal-100" : "bg-slate-100"}`}>
                {m.content.split("\n").map((line:any, idx:number) => (<p key={idx}>{line}</p>))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Textarea
            placeholder="Ask anything… e.g., 'Draft a follow‑up for Rohini Central Mall lead'"
            value={query}
            onChange={(e:any) => setQuery(e.target.value)}
            className="min-h-12 w-full"
          />
          <Button onClick={send} disabled={loading}>
            {loading ? "Thinking…" : (<span className="inline-flex items-center">Send <ChevronRight className="ml-1 h-4 w-4" /></span>)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- PropertyMap stub ---------- */
function PropertyMapStub() {
  const pins = [
    { x: "20%", y: "55%" },
    { x: "45%", y: "35%" },
    { x: "68%", y: "62%" },
    { x: "35%", y: "75%" },
  ];
  return (
    <Card className="overflow-hidden" style={{ background: theme.surface }}>
      <CardHeader className="pb-0">
        <CardTitle className="text-slate-600">Property Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-52 rounded-xl" style={{ background: "#d6eef0" }}>
          {pins.map((p, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: p.x, top: p.y }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg" style={{ background: theme.teal }}>
                <MapPin className="h-4 w-4 text-white" />
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Kanban with localStorage ---------- */
function Kanban({ tasks, setTasks }: any) {
  const addTask = () => {
    const t = prompt("New task");
    if (!t) return;
    const updated = { ...tasks, Todo: [t, ...tasks.Todo] };
    setTasks(updated);
    writeJSON(LS_KEYS.TASKS, updated);
  };

  const moveTask = (from:string, to:string, idx:number) => {
    const items = [...tasks[from]];
    const [item] = items.splice(idx,1);
    const updated = { ...tasks, [from]: items, [to]: [item, ...tasks[to]] };
    setTasks(updated);
    writeJSON(LS_KEYS.TASKS, updated);
  };

  return (
    <Card style={{ background: theme.surface }}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-slate-600">Kirrban Board</CardTitle>
        <div>
          <Button variant="ghost" onClick={addTask}>+ Add</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(tasks).map(([name, tarr]: any) => (
            <div key={name} className="rounded-2xl p-3 bg-white/60 border border-white shadow-inner">
              <div className="font-medium mb-2">{name}</div>
              {tarr.map((t:string, i:number) => (
                <div key={i} className="rounded-xl p-3 mb-2" style={{ background: i % 2 ? theme.chip : "#eaf4f6" }}>
                  <div className="flex items-center justify-between">
                    <div>{t}</div>
                    <div className="flex items-center gap-1 text-xs">
                      {name !== 'Done' && <button onClick={()=>moveTask(name,'Done',i)} className="px-2 py-1 rounded bg-white">Done</button>}
                      {name !== 'Doing' && <button onClick={()=>moveTask(name,'Doing',i)} className="px-2 py-1 rounded bg-white">Start</button>}
                      {name !== 'Todo' && <button onClick={()=>moveTask(name,'Todo',i)} className="px-2 py-1 rounded bg-white">Back</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Main component ---------- */
export default function OceanCRM() {
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any>({ Todo: [], Doing: [], Done: [] });
  const [voices, setVoices] = useState<any[]>([]);

  useEffect(() => {
    // load from localStorage on mount
    setLeads(readJSON(LS_KEYS.LEADS, []));
    setTasks(readJSON(LS_KEYS.TASKS, { Todo: ["Call back Rohini lead", "Upload site photos"], Doing: ["Prepare brochure for Sawasdee Heights"], Done: ["Follow-up email sent"] }));
    setVoices(readJSON(LS_KEYS.VOICES, []));
  }, []);

  const addLead = () => {
    const name = prompt("Lead name");
    if (!name) return;
    const phone = prompt("Phone (optional)") || "";
    const email = prompt("Email (optional)") || "";
    const newLead = { id: `l_${Date.now()}`, name, phone, email, status: "new", createdAt: Date.now() };
    const updated = [newLead, ...leads];
    setLeads(updated);
    writeJSON(LS_KEYS.LEADS, updated);
  };

  const deleteLead = (id:string) => {
    if(!confirm("Delete lead?")) return;
    const updated = leads.filter(l=>l.id!==id);
    setLeads(updated);
    writeJSON(LS_KEYS.LEADS, updated);
  };

  const onNewVoice = (note:any) => {
    setVoices(v => { const updated=[note,...v]; writeJSON(LS_KEYS.VOICES, updated); return updated; });
  };

  const deleteVoice = (id:string) => {
    if(!confirm("Delete voice note?")) return;
    const updated = voices.filter(v=>v.id!==id);
    setVoices(updated);
    writeJSON(LS_KEYS.VOICES, updated);
  };

  return (
    <div className="min-h-screen p-6" style={{ background: theme.bg }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tracking-wide" style={{ color: theme.navy }}>OCEAN CRM</div>
          <div className="px-3 py-1 rounded-full text-xs" style={{ background: theme.chip, color: theme.navy }}>Dashboard</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Input placeholder="Search leads, properties…" className="w-64" />
          <Button>Search</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCard("Properties", 125, <Building2 className="text-slate-500" />)}
          {kpiCard("New Leads", leads.length, <Users className="text-slate-500" />, theme.tealDark)}
          {kpiCard("Deals", 8, <Phone className="text-slate-500" />)}
          {kpiCard("Monthly Sales", "$24,500", <BadgeDollarSign className="text-slate-500" />, theme.navy)}

          <div className="col-span-2">
            <VoiceNoteWidget onNew={onNewVoice} />
          </div>

          <div className="col-span-2">
            <PropertyMapStub />
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
          <AIAssistant leads={leads} />
          <Kanban tasks={tasks} setTasks={(t:any)=>{ setTasks(t); writeJSON(LS_KEYS.TASKS, t); }} />

          <Card style={{ background: theme.surface }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-600">Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-500">Saved leads (local)</div>
                <div>
                  <Button onClick={addLead} variant="secondary">+ New Lead</Button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {leads.length===0 && <div className="text-sm text-slate-500">No leads yet — add one.</div>}
                {leads.map((l:any)=>(
                  <div key={l.id} className="p-3 mb-2 rounded-xl bg-white/80 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-slate-500">{l.phone} • {l.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>{ navigator.clipboard?.writeText(JSON.stringify(l)); alert('Copied lead JSON'); }} className="px-2 py-1 rounded bg-white">Copy</button>
                      <button onClick={()=>deleteLead(l.id)} className="px-2 py-1 rounded bg-red-100 text-red-700">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: theme.surface }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-600">Voice Notes (saved)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-40 overflow-y-auto">
                {voices.length===0 && <div className="text-sm text-slate-500">No voice notes saved yet.</div>}
                {voices.map((v:any)=>(
                  <div key={v.id} className="p-3 mb-2 rounded-xl bg-white/80 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{v.label}</div>
                      <div className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()} • {v.duration}s</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <audio controls src={v.data} />
                      <button onClick={()=>{ deleteVoice(v.id); }} className="p-2 rounded bg-white"><Trash2 /></button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <div className="mt-6 text-xs text-slate-500">Prototype UI • All data stored in browser localStorage for demo. Refresh will keep your leads & voice notes.</div>
    </div>
  );
}
