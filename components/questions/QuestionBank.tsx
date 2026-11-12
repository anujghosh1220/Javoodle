/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { deleteQuestionAction } from "@/app/actions/question-review";

function downloadJson(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function norm(s: string) {
  return (s || "").toLowerCase().replace(/[`*_#>\-]/g, " ").replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s]/gu, "").trim();
}
function sim(a: string, b: string) {
  const ta = new Set(norm(a).split(" ").filter(Boolean));
  const tb = new Set(norm(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0; for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function QuestionBank({ initialQuestions, documents, topics, filters }: { initialQuestions: any[]; documents: any[]; topics: any[]; filters: any }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [compareMode, setCompareMode] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const docMap = useMemo(() => Object.fromEntries(documents.map(d => [d.id, d])), [documents]);
  const topicMap = useMemo(() => Object.fromEntries(topics.map(t => [t.id, t])), [topics]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams();
    const next = { ...filters, [key]: value };
    for (const [k,v] of Object.entries(next)) if (v) params.set(k, String(v));
    router.push(`/admin/questions/bank?${params.toString()}`);
  }

  const selectedIds = Object.keys(selected).filter(k => selected[k]);
  const selectedQuestions = initialQuestions.filter(q => selected[q.id]);

  async function exportSelected() {
    if (!selectedQuestions.length) { setMsg("Select questions to export"); return; }
    // fetch full details for selected
    const full = await Promise.all(selectedIds.map(async (id) => {
      const r = await fetch(`/api/admin/questions/${id}`);
      return r.ok ? r.json() : null;
    }));
    downloadJson(`javoodle-questions-export-${Date.now()}.json`, { exported_at: new Date().toISOString(), questions: full.filter(Boolean) });
    setMsg(`Exported ${full.filter(Boolean).length} question(s)`);
  }

  function remove(id: string) {
    if (!confirm("Delete this question? This cannot be undone. (Historical exam snapshots remain intact.)")) return;
    startTransition(async () => {
      await deleteQuestionAction(id);
      setMsg("Question deleted");
      router.refresh();
    });
  }

  const pairs = useMemo(() => {
    if (!compareMode) return [] as any[];
    const out: any[] = [];
    for (let i=0;i<initialQuestions.length;i++) for (let j=i+1;j<initialQuestions.length;j++) {
      const a = initialQuestions[i], b = initialQuestions[j];
      const s = sim(a.text, b.text);
      if (s >= 0.85 || norm(a.text) === norm(b.text)) out.push({ a, b, score: s || 1 });
    }
    return out.slice(0, 50);
  }, [compareMode, initialQuestions]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="grid gap-2 p-4 sm:grid-cols-3 lg:grid-cols-5">
        <input defaultValue={filters.search||""} placeholder="Search question text" className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm sm:col-span-2" onKeyDown={(e)=>{ if(e.key==='Enter') updateFilter('search',(e.target as HTMLInputElement).value); }} />
        <select defaultValue={filters.topic||""} onChange={(e)=>updateFilter('topic',e.target.value)} className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm"><option value="">All topics</option>{topics.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select defaultValue={filters.type||""} onChange={(e)=>updateFilter('type',e.target.value)} className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm"><option value="">All types</option>{['mcq','fill_blank','true_false','output_prediction','find_error','theory','coding'].map(t=><option key={t} value={t}>{t}</option>)}</select>
        <select defaultValue={filters.difficulty||""} onChange={(e)=>updateFilter('difficulty',e.target.value)} className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm"><option value="">Any difficulty</option>{[1,2,3,4,5].map(d=><option key={d} value={d}>{d}</option>)}</select>
        <input defaultValue={filters.sourceYear||""} placeholder="Source year" className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm" onBlur={(e)=>updateFilter('sourceYear',e.target.value)} />
        <select defaultValue={filters.sourceDocument||""} onChange={(e)=>updateFilter('sourceDocument',e.target.value)} className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm"><option value="">All documents</option>{documents.map(d=><option key={d.id} value={d.id}>{d.original_filename||d.filename}</option>)}</select>
        <select defaultValue={filters.questionStatus||""} onChange={(e)=>updateFilter('questionStatus',e.target.value)} className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm"><option value="">Any question status</option>{['pending_review','approved','rejected','needs_revision'].map(s=><option key={s} value={s}>{s}</option>)}</select>
        <select defaultValue={filters.answerStatus||""} onChange={(e)=>updateFilter('answerStatus',e.target.value)} className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm"><option value="">Any answer status</option>{['unverified','approved','rejected','needs_revision'].map(s=><option key={s} value={s}>{s}</option>)}</select>
        <input defaultValue={filters.marks||""} placeholder="Marks" className="rounded-xl border-2 border-cream-300 px-3 py-2 text-sm" onBlur={(e)=>updateFilter('marks',e.target.value)} />
        <div className="flex flex-wrap gap-2 sm:col-span-3 lg:col-span-5">
          <Button variant="secondary" onClick={()=>router.push('/admin/questions/bank')}>Clear filters</Button>
          <Button variant="secondary" onClick={exportSelected} disabled={!selectedIds.length}>Export selected ({selectedIds.length})</Button>
          <Button variant={compareMode?"primary":"secondary"} onClick={()=>setCompareMode(v=>!v)}>Detect duplicates</Button>
          {msg && <span className="text-sm font-semibold text-ink-600">{msg}</span>}
        </div>
      </Card>

      {compareMode && (
        <Card className="p-4">
          <h2 className="font-extrabold text-ink-800">Potential duplicates (no automatic merge/delete)</h2>
          {pairs.length === 0 ? <p className="text-sm text-ink-400 mt-1">No likely duplicates detected in current results.</p> : (
            <ul className="mt-2 space-y-2 text-sm">
              {pairs.map((p, i) => (
                <li key={i} className="rounded-xl border-2 border-sun-100 bg-sun-50 p-2">
                  <div className="font-bold text-sun-700">Score {Math.round(p.score*100)}%</div>
                  <div className="grid gap-2 sm:grid-cols-2 mt-1">
                    <div><Link href={`/admin/questions/${p.a.id}`} className="text-lav-500 underline">A: {p.a.id.slice(0,8)}</Link><div className="line-clamp-3">{p.a.text}</div></div>
                    <div><Link href={`/admin/questions/${p.b.id}`} className="text-lav-500 underline">B: {p.b.id.slice(0,8)}</Link><div className="line-clamp-3">{p.b.text}</div></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="grid gap-3">
        {initialQuestions.length === 0 ? <Card className="p-6 text-ink-400">No questions match the current filters.</Card> : initialQuestions.map((q) => (
          <Card key={q.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={!!selected[q.id]} onChange={(e)=>setSelected(s=>({...s,[q.id]:e.target.checked}))} className="mt-1" />
                <div>
                  <div className="font-semibold text-ink-800 line-clamp-3">{q.text}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs">
                    <Chip tone="ink">{q.type}</Chip><Chip tone="ink">{q.marks} marks</Chip><Chip tone="ink">D{q.difficulty}</Chip>
                    <Chip tone={q.question_status==='approved'?'mint':'sun'}>Q: {q.question_status}</Chip>
                    <Chip tone={q.answer_status==='approved'?'mint':'sun'}>A: {q.answer_status}</Chip>
                    {q.source_year && <Chip tone="ink">{q.source_year}</Chip>}
                    {q.source_question_number && <Chip tone="ink">#{q.source_question_number}</Chip>}
                  </div>
                  <div className="mt-1 text-xs text-ink-400">Topic: {topicMap[q.topic_id]?.name || q.topic_id || '—'} · Source: {q.source_document_id ? (docMap[q.source_document_id]?.original_filename || q.source_document_id.slice(0,8)) : '—'} · v{q.version}</div>
                </div>
              </label>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={`/admin/questions/${q.id}`} className="rounded-full border-2 border-cream-300 px-3 py-1 text-sm font-bold text-ink-700">Edit</Link>
                <button onClick={()=>remove(q.id)} className="rounded-full border-2 border-red-200 px-3 py-1 text-sm font-bold text-red-500" disabled={pending}>Delete</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
