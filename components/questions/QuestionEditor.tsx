/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { saveQuestionEditsAction, updateQuestionReviewAction } from "@/app/actions/question-review";

function safeParse(text: string) { try { return JSON.parse(text); } catch { return text; } }

export function QuestionEditor({ initial }: { initial: any }) {
  const router = useRouter();
  const q = initial.question;
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<any>({
    text: q.text ?? "",
    type: q.type ?? "theory",
    marks: q.marks ?? 1,
    difficulty: q.difficulty ?? 1,
    topic_id: q.topic_id ?? "",
    source_question_number: q.source_question_number ?? "",
    source_page: q.source_page ?? "",
    source_year: q.source_year ?? "",
    proposed_answer: JSON.stringify(q.proposed_answer ?? "", null, 2),
    model_answer: JSON.stringify(q.model_answer ?? "", null, 2),
    reference_solution: JSON.stringify(q.reference_solution ?? "", null, 2),
    explanation: JSON.stringify(q.explanation ?? "", null, 2),
    marking_rubric: JSON.stringify(q.marking_rubric ?? initial.rubrics ?? "", null, 2),
    test_cases: JSON.stringify((q.test_cases ?? initial.testCases ?? []), null, 2),
    options: (initial.options ?? []).map((o:any)=>({ label: o.label, text: o.text, is_correct: o.is_correct })),
  });

  function save() {
    startTransition(async () => {
      const parse = (v: any) => typeof v === "string" ? safeParse(v) : v;
      const patch: any = {
        text: form.text, type: form.type, marks: Number(form.marks)||0, difficulty: Number(form.difficulty)||1,
        topic_id: form.topic_id || null,
        source_question_number: form.source_question_number || null,
        source_page: form.source_page === "" ? null : Number(form.source_page),
        source_year: form.source_year === "" ? null : Number(form.source_year),
        proposed_answer: parse(form.proposed_answer), model_answer: parse(form.model_answer),
        reference_solution: parse(form.reference_solution), explanation: parse(form.explanation),
        marking_rubric: parse(form.marking_rubric), test_cases: parse(form.test_cases),
      };
      const tcs = Array.isArray(patch.test_cases) ? patch.test_cases : [];
      const mr = parse(form.marking_rubric);
      const rubrics = Array.isArray(mr) ? mr : (mr?.criteria && Array.isArray(mr.criteria) ? mr.criteria : []);
      const res = await saveQuestionEditsAction({ questionId: q.id, patch, options: form.type === 'mcq' ? form.options : undefined, testCases: tcs, rubrics });
      setMsg(res.ok ? `Saved as version ${res.version}` : (res as any).error || 'Save failed');
      if (res.ok) router.refresh();
    });
  }

  function setStatus(which: 'question'|'answer', value: string) {
    startTransition(async () => {
      await updateQuestionReviewAction({ questionId: q.id, questionStatus: which==='question'? value as any : undefined, answerStatus: which==='answer'? value as any : undefined });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
      <Card className="flex flex-col gap-3 p-4">
        {msg && <div className="rounded-xl bg-cream-100 px-3 py-2 text-sm font-semibold text-ink-700">{msg}</div>}
        <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Question text</span>
          <textarea className="h-32 rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.text} onChange={(e)=>setForm({...form,text:e.target.value})} /></label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Type</span>
            <select className="rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}>{['mcq','fill_blank','true_false','output_prediction','find_error','theory','coding'].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Marks</span><input type="number" className="rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.marks} onChange={(e)=>setForm({...form,marks:e.target.value})} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Difficulty</span><input type="number" min={1} max={5} className="rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.difficulty} onChange={(e)=>setForm({...form,difficulty:e.target.value})} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">Source Q#</span><input className="rounded-xl border-2 border-cream-300 p-2 text-sm" value={form.source_question_number||""} onChange={(e)=>setForm({...form,source_question_number:e.target.value})} /></label>
        </div>

        {form.type === 'mcq' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-400">Options</span>
              <Button size="sm" variant="secondary" onClick={()=>setForm((f:any)=>({...f,options:[...(f.options||[]),{label:String.fromCharCode(65+(f.options?.length||0)),text:"",is_correct:false}]}))}>Add</Button></div>
            {(form.options||[]).map((o:any,i:number)=>(
              <div key={i} className="grid grid-cols-[60px,1fr,auto,auto] items-center gap-2">
                <input className="rounded-lg border-2 border-cream-300 p-1 text-sm" value={o.label} onChange={(e)=>setForm((f:any)=>({...f,options:f.options.map((x:any,idx:number)=>idx===i?{...x,label:e.target.value}:x)}))} />
                <input className="rounded-lg border-2 border-cream-300 p-1 text-sm" value={o.text} onChange={(e)=>setForm((f:any)=>({...f,options:f.options.map((x:any,idx:number)=>idx===i?{...x,text:e.target.value}:x)}))} />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!o.is_correct} onChange={(e)=>setForm((f:any)=>({...f,options:f.options.map((x:any,idx:number)=>idx===i?{...x,is_correct:e.target.checked}:x)}))}/>Correct</label>
                <button className="text-xs text-red-500" onClick={()=>setForm((f:any)=>({...f,options:f.options.filter((_:any,idx:number)=>idx!==i)}))}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {([['proposed_answer','Proposed answer'],['model_answer','Model answer'],['reference_solution','Reference solution'],['test_cases','Test cases (JSON array)'],['marking_rubric','Marking rubric (JSON)'],['explanation','Explanation']] as const).map(([k,label])=>(
          <label key={k} className="flex flex-col gap-1"><span className="text-xs font-bold text-ink-400">{label}</span>
            <textarea className="h-28 rounded-xl border-2 border-cream-300 p-2 font-mono text-xs" value={(form as any)[k] ?? ""} onChange={(e)=>setForm({...form,[k]:e.target.value})} /></label>
        ))}
        <div className="flex gap-2"><Button onClick={save} disabled={pending}>Save (creates new version)</Button></div>
      </Card>

      <div className="flex flex-col gap-3">
        <Card className="p-4">
          <div className="font-extrabold text-ink-800">Status</div>
          <div className="mt-2 flex flex-wrap gap-1"><Chip tone="mint">Q: {q.question_status}</Chip><Chip tone="sun">A: {q.answer_status}</Chip><Chip tone="ink">v{q.version}</Chip></div>
          <div className="mt-3 text-xs font-bold text-ink-500">Question status</div>
          <div className="mt-1 flex flex-wrap gap-1">{['pending_review','approved','rejected','needs_revision'].map(s=><Button key={s} size="sm" variant="secondary" onClick={()=>setStatus('question',s)} disabled={pending}>{s}</Button>)}</div>
          <div className="mt-3 text-xs font-bold text-ink-500">Answer status</div>
          <div className="mt-1 flex flex-wrap gap-1">{['unverified','approved','rejected','needs_revision'].map(s=><Button key={s} size="sm" variant="secondary" onClick={()=>setStatus('answer',s)} disabled={pending}>{s}</Button>)}</div>
        </Card>
        <Card className="p-4">
          <div className="font-extrabold text-ink-800">Version history</div>
          <ul className="mt-2 space-y-1 text-sm">{(initial.versions||[]).map((v:any)=>(<li key={v.id}>v{v.version} · {new Date(v.created_at).toLocaleString()}</li>))}</ul>
        </Card>
        <Card className="p-4">
          <div className="font-extrabold text-ink-800">Audit trail</div>
          <ul className="mt-2 space-y-2 text-sm max-h-80 overflow-auto">{(initial.events||[]).map((e:any)=>(<li key={e.id}><div className="font-semibold">{e.action}</div><div className="text-xs text-ink-400">{e.actor_email||'admin'} · {new Date(e.created_at).toLocaleString()}</div>{e.reason && <div className="text-xs">{e.reason}</div>}</li>))}</ul>
        </Card>
        <Card className="p-4 text-xs text-ink-500">Provenance and source refs are preserved in the database. Historical exam attempts use frozen question snapshots; edits create new versions without altering past attempts.</Card>
      </div>
    </div>
  );
}