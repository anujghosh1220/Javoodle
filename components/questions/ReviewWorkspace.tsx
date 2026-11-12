/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { getDocumentSignedUrlAction } from "@/app/actions/question-studio";
import { updateQuestionReviewAction, saveQuestionEditsAction, flagQuestionAction } from "@/app/actions/question-review";

function safeParseJson(text: string) {
  try { return { ok: true as const, value: JSON.parse(text) }; } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Invalid JSON" }; }
}

export function ReviewWorkspace({ initialQueue, documents }: { initialQueue: any[]; documents: any[] }) {
  const router = useRouter();
  const [queue] = useState(initialQueue);
  const [selectedId, setSelectedId] = useState<string | null>(initialQueue[0]?.id ?? null);
  const [detail, setDetail] = useState<any>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docMime, setDocMime] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const r = await fetch(`/api/admin/questions/${selectedId}`);
      const j = await r.json().catch(() => null);
      if (j?.question) {
        setDetail(j);
        const q = j.question;
        setForm({
          text: q.text ?? "",
          type: q.type ?? "theory",
          marks: q.marks ?? 1,
          difficulty: q.difficulty ?? 1,
          source_question_number: q.source_question_number ?? "",
          source_page: q.source_page ?? "",
          source_year: q.source_year ?? "",
          proposed_answer: JSON.stringify(q.proposed_answer ?? "", null, 2),
          model_answer: JSON.stringify(q.model_answer ?? "", null, 2),
          reference_solution: JSON.stringify(q.reference_solution ?? "", null, 2),
          explanation: JSON.stringify(q.explanation ?? "", null, 2),
          marking_rubric: JSON.stringify(q.marking_rubric ?? j.rubrics ?? "", null, 2),
          test_cases: JSON.stringify((q.test_cases ?? j.testCases ?? []), null, 2),
          options: (j.options ?? []).map((o:any)=>({label:o.label,text:o.text,is_correct:o.is_correct})),
        });
        if (q.source_document_id) {
          const res = await getDocumentSignedUrlAction(q.source_document_id);
          if ((res as any).ok) { setDocUrl((res as any).url); setDocMime((res as any).mime); }
          else { setDocUrl(null); setDocMime(null); }
        } else { setDocUrl(null); setDocMime(null); }
      }
    })();
  }, [selectedId]);

  const selected = useMemo(() => queue.find(q => q.id === selectedId) || null, [queue, selectedId]);

  function updateOption(i:number, key:string, value:any) {
    setForm((f:any)=>({ ...f, options: (f.options||[]).map((o:any,idx:number)=> idx===i ? { ...o, [key]: value } : o) }));
  }
  function addOption() { setForm((f:any)=>({ ...f, options: [...(f.options||[]), { label: String.fromCharCode(65 + (f.options?.length||0)), text: "", is_correct: false }] })); }
  function removeOption(i:number) { setForm((f:any)=>({ ...f, options: (f.options||[]).filter((_:any,idx:number)=>idx!==i) })); }

  function buildPatch() {
    const parseField = (key:string) => {
      const v = form[key];
      if (typeof v !== "string") return v;
      const t = v.trim();
      if (t === "") return null;
      const p = safeParseJson(t);
      return p.ok ? p.value : v; // keep raw string if not JSON
    };
    return {
      text: form.text,
      type: form.type,
      marks: Number(form.marks) || 0,
      difficulty: Number(form.difficulty) || 1,
      source_question_number: form.source_question_number || null,
      source_page: form.source_page === "" || form.source_page == null ? null : Number(form.source_page),
      source_year: form.source_year === "" || form.source_year == null ? null : Number(form.source_year),
      proposed_answer: parseField("proposed_answer"),
      model_answer: parseField("model_answer"),
      reference_solution: parseField("reference_solution"),
      explanation: parseField("explanation"),
      marking_rubric: parseField("marking_rubric"),
      test_cases: parseField("test_cases"),
    };
  }

  function saveEdits(reason?: string) {
    if (!selectedId) return;
    startTransition(async () => {
      const patch = buildPatch();
      const tcsParsed = safeParseJson(typeof form.test_cases === "string" ? form.test_cases : JSON.stringify(form.test_cases ?? []));
      const rubParsed = safeParseJson(typeof form.marking_rubric === "string" ? form.marking_rubric : JSON.stringify(form.marking_rubric ?? []));
      const testCases = tcsParsed.ok && Array.isArray(tcsParsed.value) ? tcsParsed.value : (Array.isArray(patch.test_cases) ? patch.test_cases : []);
      const rubrics = rubParsed.ok ? (Array.isArray(rubParsed.value) ? rubParsed.value : (rubParsed.value?.criteria && Array.isArray(rubParsed.value.criteria) ? rubParsed.value.criteria : [])) : [];
      const res = await saveQuestionEditsAction({ questionId: selectedId, patch, options: form.type === "mcq" ? form.options : undefined, testCases, rubrics, reason });
      setMsg(res.ok ? `Saved (version ${res.version})` : (res as any).error || "Save failed");
      router.refresh();
    });
  }

  function setStatus(which: "question"|"answer", value: string) {
    if (!selectedId) return;
    startTransition(async () => {
      const res = await updateQuestionReviewAction({
        questionId: selectedId,
        questionStatus: which === "question" ? value as any : undefined,
        answerStatus: which === "answer" ? value as any : undefined,
      });
      setMsg(res.ok ? "Status updated" : (res as any).error || "Update failed");
      if (res.ok) router.refresh();
    });
  }

  function doFlag() {
    if (!selectedId) return;
    const reason = prompt("Reason for flagging/manual review?") || "Flagged for manual review";
    startTransition(async () => {
      await flagQuestionAction(selectedId, reason);
      setMsg("Flagged for manual review");
      router.refresh();
    });
  }

  const docMeta = useMemo(() => documents.find(d => d.id === detail?.question?.source_document_id), [documents, detail]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
      <Card className="flex max-h-[80vh] flex-col gap-2 overflow-auto p-3">
        <div className="text-sm font-bold text-ink-500">{queue.length} in queue</div>
        {queue.map((q) => (
          <button key={q.id} onClick={() => setSelectedId(q.id)} className={`rounded-xl border-2 p-2 text-left ${selectedId===q.id?"border-lav-300 bg-lav-50":"border-cream-200"}`}>
            <div className="line-clamp-2 text-sm font-semibold text-ink-800">{q.text}</div>
            <div className="mt-1 flex flex-wrap gap-1 text-xs">
              <span className="rounded-full bg-cream-100 px-2 py-0.5">{q.type}</span>
              <span className="rounded-full bg-cream-100 px-2 py-0.5">Q:{q.question_status}</span>
              <span className="rounded-full bg-cream-100 px-2 py-0.5">A:{q.answer_status}</span>
            </div>
          </button>
        ))}
      </Card>

      {!selected || !detail ? (
        <Card className="p-6 text-ink-400">Select a question to review.</Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between"><h2 className="font-extrabold text-ink-800">Original source</h2>{docMeta && <Chip tone="ink">{docMeta.original_filename || docMeta.filename}</Chip>}</div>
            <div className="text-sm text-ink-500">Year: {detail.question.source_year ?? "—"} · Page: {detail.question.source_page ?? "—"} · Q#: {detail.question.source_question_number ?? "—"}</div>
            {docUrl ? (
              docMime?.includes("pdf") ? <iframe src={docUrl} className="h-[65vh] w-full rounded-xl border" title="Source document" /> :
              docMime?.startsWith("image/") ? <Image src={docUrl} alt="Source" width={1200} height={1600} unoptimized className="max-h-[65vh] w-full rounded-xl object-contain" /> :
              <a href={docUrl} target="_blank" rel="noreferrer" className="text-lav-500 underline">Open source</a>
            ) : <div className="rounded-xl bg-cream-100 p-4 text-sm text-ink-500">No source document linked or preview unavailable. Use extracted/provenance fields and import context for review.</div>}
            {detail.question.provenance && <pre className="max-h-40 overflow-auto rounded-xl bg-cream-50 p-2 text-xs">{JSON.stringify(detail.question.provenance, null, 2)}</pre>}
          </Card>

          <Card className="flex max-h-[80vh] flex-col gap-3 overflow-auto p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-ink-800">Review &amp; edit</h2>
              <Chip tone="mint">Q: {detail.question.question_status}</Chip>
              <Chip tone="sun">A: {detail.question.answer_status}</Chip>
            </div>
            {msg && <div className="rounded-xl bg-cream-100 px-2 py-1 text-sm font-semibold text-ink-700">{msg}</div>}

            <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Question text</span>
              <textarea className="h-28 rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.text||""} onChange={(e)=>setForm({...form,text:e.target.value})} /></label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Type</span>
                <select className="rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}>
                  {['mcq','fill_blank','true_false','output_prediction','find_error','theory','coding'].map(t=><option key={t} value={t}>{t}</option>)}
                </select></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Marks</span><input type="number" className="rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.marks} onChange={(e)=>setForm({...form,marks:e.target.value})}/></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Difficulty</span><input type="number" min={1} max={5} className="rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.difficulty} onChange={(e)=>setForm({...form,difficulty:e.target.value})}/></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Source Q#</span><input className="rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.source_question_number||""} onChange={(e)=>setForm({...form,source_question_number:e.target.value})}/></label>
            </div>

            {form.type === "mcq" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-400">MCQ options</span><Button size="sm" variant="secondary" onClick={addOption}>Add option</Button></div>
                {(form.options||[]).map((o:any,i:number)=>(
                  <div key={i} className="grid grid-cols-[60px,1fr,auto,auto] items-center gap-2">
                    <input className="rounded-lg border-2 border-cream-300 p-1 text-sm" value={o.label} onChange={(e)=>updateOption(i,'label',e.target.value)} placeholder="Label"/>
                    <input className="rounded-lg border-2 border-cream-300 p-1 text-sm" value={o.text} onChange={(e)=>updateOption(i,'text',e.target.value)} placeholder="Option text"/>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!o.is_correct} onChange={(e)=>updateOption(i,'is_correct',e.target.checked)}/>Correct</label>
                    <button onClick={()=>removeOption(i)} className="text-xs text-red-500">Remove</button>
                  </div>
                ))}
              </div>
            )}

            {[
              ["proposed_answer","Proposed answer (JSON/text)"],
              ["model_answer","Model answer (JSON/text)"],
              ["reference_solution","Java reference solution (JSON/text)"],
              ["test_cases","Test cases (JSON array)"],
              ["marking_rubric","Marking rubric (JSON)"],
              ["explanation","Explanation (JSON/text)"],
            ].map(([key,label])=>(
              <label key={key} className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">{label}</span>
                <textarea className="h-24 rounded-xl border-2 border-cream-300 p-2 font-mono text-xs" value={(form as any)[key] ?? ""} onChange={(e)=>setForm({...form,[key]:e.target.value})} /></label>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button onClick={()=>saveEdits()} disabled={pending}>Save edits (new version)</Button>
              <Button variant="secondary" onClick={doFlag} disabled={pending}>Flag manual review</Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-cream-200 p-2">
                <div className="mb-1 text-xs font-bold text-ink-500">Question status</div>
                <div className="flex flex-wrap gap-1">
                  {['pending_review','approved','rejected','needs_revision'].map(s=> <Button key={s} size="sm" variant={detail.question.question_status===s?"primary":"secondary"} onClick={()=>setStatus('question',s)} disabled={pending}>{s}</Button>)}
                </div>
              </div>
              <div className="rounded-xl border-2 border-cream-200 p-2">
                <div className="mb-1 text-xs font-bold text-ink-500">Answer status (independent)</div>
                <div className="flex flex-wrap gap-1">
                  {['unverified','approved','rejected','needs_revision'].map(s=> <Button key={s} size="sm" variant={detail.question.answer_status===s?"mint":"secondary"} onClick={()=>setStatus('answer',s)} disabled={pending}>{s}</Button>)}
                </div>
              </div>
            </div>
            <p className="text-xs text-ink-400">A question can be approved while its answer remains unverified. Questions with unverified answers must never be used for automatically marked examinations.</p>
          </Card>
        </div>
      )}
    </div>
  );
}



