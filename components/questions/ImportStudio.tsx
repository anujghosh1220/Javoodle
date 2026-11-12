/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { getAnalysisPromptAction, validateImportAction, importQuestionsAction } from "@/app/actions/question-studio";

export function ImportStudio({ documents }: { documents: any[] }) {
  const [docId, setDocId] = useState(documents[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [extracted, setExtracted] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [validation, setValidation] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function generatePrompt() {
    if (!docId) return;
    const res = await getAnalysisPromptAction(docId);
    if (res.ok) { setPrompt(res.prompt); setExtracted(res.extractedText); setMsg("Prompt generated"); }
    else setMsg(res.error || "Failed to generate prompt");
  }

  async function copyPrompt() {
    if (!prompt) return; await navigator.clipboard.writeText(prompt); setMsg("Prompt copied");
  }
  function downloadExtracted() {
    const blob = new Blob([extracted || ""], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "extracted-content.txt"; a.click(); URL.revokeObjectURL(a.href);
  }
  function downloadPrompt() {
    const blob = new Blob([prompt || ""], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ai-analysis-prompt.txt"; a.click(); URL.revokeObjectURL(a.href);
  }

  async function onJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const text = await f.text(); setJsonText(text);
  }

  function parseJson() {
    try { return JSON.parse(jsonText); } catch (e) { setMsg("Invalid JSON: " + (e instanceof Error ? e.message : "parse error")); return null; }
  }

  async function validate() {
    const payload = parseJson(); if (!payload) return;
    startTransition(async () => {
      const res = await validateImportAction(payload);
      setValidation(res);
      setMsg(res.ok ? `Valid: ${(res.questions||[]).length} question(s) ready to import` : `Validation found ${(res.issues||[]).length} issue(s)`);
    });
  }

  async function doImport() {
    const payload = parseJson(); if (!payload) return;
    startTransition(async () => {
      const res = await importQuestionsAction({ payload, sourceDocumentId: docId || null, filename: documents.find(d=>d.id===docId)?.original_filename || null });
      if (res.ok) setMsg(`Imported ${res.insertedCount} question(s) as pending review (batch ${res.batchId}). ${res.duplicates?.length||0} potential duplicate(s) flagged for comparison.`);
      else setMsg(`Import blocked: ${(res.issues||[]).length} validation issue(s). Fix and retry.`);
      setValidation(res);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="font-extrabold text-ink-800">1. Generate AI analysis prompt</h2>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Source document</span>
            <select value={docId} onChange={(e)=>setDocId(e.target.value)} className="rounded-xl border-2 border-cream-300 px-3 py-2 font-semibold text-ink-800">
              {documents.map(d => <option key={d.id} value={d.id}>{d.original_filename || d.filename} ({d.status})</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generatePrompt} disabled={pending || !docId}>Generate prompt</Button>
            <Button variant="secondary" onClick={copyPrompt} disabled={!prompt}>Copy prompt</Button>
            <Button variant="secondary" onClick={downloadPrompt} disabled={!prompt}>Download prompt</Button>
            <Button variant="ghost" onClick={downloadExtracted} disabled={!extracted}>Download extracted content</Button>
          </div>
          <textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="Generated prompt will appear here..." className="h-64 w-full rounded-xl border-2 border-cream-300 p-3 text-xs font-mono" />
          <p className="text-xs text-ink-400">Prompt instructs ChatGPT to preserve wording/marks/numbering, classify ICSE topics, flag ambiguity, and distinguish source-derived vs AI-generated content without inventing missing data.</p>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="font-extrabold text-ink-800">2. Paste or upload JSON</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-full border-2 border-cream-300 bg-white px-4 py-2 text-sm font-bold text-ink-700">
              <input type="file" accept="application/json,.json" className="hidden" onChange={onJsonFile} /> Upload JSON file
            </label>
            <Chip tone="ink">{jsonText ? `${jsonText.length} chars` : "No JSON loaded"}</Chip>
          </div>
          <textarea value={jsonText} onChange={(e)=>setJsonText(e.target.value)} placeholder='Paste structured JSON here (must include "questions": [...])' className="h-72 w-full rounded-xl border-2 border-cream-300 p-3 text-xs font-mono" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={validate} disabled={pending || !jsonText.trim()}>Validate &amp; preview</Button>
            <Button variant="mint" onClick={doImport} disabled={pending || !jsonText.trim()}>Import valid questions</Button>
          </div>
          {msg && <div className="rounded-xl bg-cream-100 px-3 py-2 text-sm font-semibold text-ink-700">{msg}</div>}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="font-extrabold text-ink-800">Validation &amp; preview</h2>
          {!validation ? (
            <p className="text-sm text-ink-400">Run validation to see parsed questions, duplicates, and exact field errors.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <Chip tone={validation.ok ? "mint" : "sun"}>{validation.ok ? "Valid" : "Has issues"}</Chip>
                <Chip tone="ink">Questions: {(validation.questions||[]).length}</Chip>
                <Chip tone="ink">Issues: {(validation.issues||[]).length}</Chip>
                <Chip tone="ink">Duplicates: {(validation.duplicates||[]).length}</Chip>
              </div>
              {(validation.issues||[]).length > 0 && (
                <div className="max-h-56 overflow-auto rounded-xl border-2 border-red-100 bg-red-50 p-3 text-sm">
                  <div className="mb-1 font-bold text-red-600">Validation errors</div>
                  <ul className="space-y-1">
                    {validation.issues.map((iss:any,i:number)=>(<li key={i}><span className="font-semibold">{iss.questionRef}</span> · <code>{iss.path}</code>: {iss.message}</li>))}
                  </ul>
                </div>
              )}
              {(validation.duplicates||[]).length > 0 && (
                <div className="max-h-48 overflow-auto rounded-xl border-2 border-sun-100 bg-sun-50 p-3 text-sm">
                  <div className="mb-1 font-bold text-sun-600">Potential duplicates (compare before/after import)</div>
                  <ul className="space-y-1">
                    {validation.duplicates.map((d:any,i:number)=>(<li key={i}>{d.incomingRef} ≈ existing {d.existingId.slice(0,8)} (score {Math.round(d.score*100)}%)</li>))}
                  </ul>
                </div>
              )}
              {(validation.questions||[]).length > 0 && (
                <div className="max-h-[28rem] overflow-auto rounded-xl border-2 border-cream-200 p-3 text-sm">
                  <div className="mb-2 font-bold text-ink-700">Parsed questions preview</div>
                  <ol className="list-decimal space-y-2 pl-5">
                    {validation.questions.slice(0,50).map((q:any,i:number)=>(
                      <li key={i}>
                        <div className="font-semibold text-ink-800">{q.question_text}</div>
                        <div className="text-xs text-ink-400">{q.question_type} · {q.marks} marks · {q.source_question_number ? `Q${q.source_question_number}` : ""} {q.subquestions?.length ? `· ${q.subquestions.length} subquestion(s)` : ""}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </Card>
        <Card className="p-4 text-sm text-ink-500">
          <b>Workflow:</b> Upload → extract → copy prompt + extracted content → use ChatGPT manually to produce JSON → validate → import. All imported questions enter <b>pending review</b> with <b>unverified answers</b>. Nothing is published automatically.
        </Card>
      </div>
    </div>
  );
}
