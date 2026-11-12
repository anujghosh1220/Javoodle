/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, RotateCcw, Trash2, Eye, Copy, Wand2, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { extractDocumentAction, deleteDocumentAction, getDocumentSignedUrlAction, getAnalysisPromptAction, updateExtractedTextAction } from "@/app/actions/question-studio";

export function DocumentsManager({ initialDocs }: { initialDocs: any[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; url?: string; mime?: string; name?: string; text?: string; extractionId?: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function runExtract(id: string) {
    setPendingId(id); setMsg(null);
    startTransition(async () => {
      const res = await extractDocumentAction(id);
      setMsg(res.ok ? `Extraction: ${res.status}` : (res as any).error || "Extraction failed");
      setPendingId(null);
      router.refresh();
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this document and its storage file? This cannot be undone.")) return;
    setPendingId(id);
    startTransition(async () => {
      await deleteDocumentAction(id);
      setDocs((d) => d.filter((x) => x.id !== id));
      if (preview?.id === id) setPreview(null);
      setPendingId(null);
      router.refresh();
    });
  }

  async function openOriginal(id: string) {
    setPendingId(id);
    const res = await getDocumentSignedUrlAction(id);
    setPendingId(null);
    if (res.ok) setPreview({ id, url: (res as any).url, mime: (res as any).mime, name: (res as any).name });
    else setMsg((res as any).error || "Could not open document");
  }

  async function loadExtraction(id: string) {
    setPendingId(id);
    const r = await fetch(`/api/admin/documents/${id}/extraction`);
    const j = await r.json().catch(() => ({}));
    setPendingId(null);
    if (!r.ok) { setMsg(j.error || "Failed to load extraction"); return; }
    setPreview({ id, text: j.text ?? "", extractionId: j.extractionId, name: j.name });
  }

  async function saveExtractionText() {
    if (!preview?.extractionId) return;
    setPendingId(preview.id);
    const res = await updateExtractedTextAction(preview.extractionId, preview.text || "");
    setPendingId(null);
    setMsg(res.ok ? "Extracted text saved" : (res as any).error || "Save failed");
    router.refresh();
  }

  async function copyPrompt(id: string) {
    const res = await getAnalysisPromptAction(id);
    if ((res as any).ok) {
      await navigator.clipboard.writeText((res as any).prompt);
      setMsg("AI analysis prompt copied to clipboard");
    } else setMsg((res as any).error || "Failed to generate prompt");
  }

  async function downloadText(id: string) {
    const r = await fetch(`/api/admin/documents/${id}/extraction`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.error || "No extracted text"); return; }
    const blob = new Blob([j.text ?? ""], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(j.name || "document").replace(/\.[^.]+$/, "")}-extracted.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && <div className="rounded-xl bg-cream-100 px-3 py-2 text-sm font-semibold text-ink-700">{msg}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {docs.map((d) => (
            <Card key={d.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-extrabold text-ink-800">{d.original_filename || d.filename}</div>
                  <div className="text-xs font-semibold text-ink-400">{d.mime} · {String(d.source_type || "").replace(/_/g," ")} {d.source_year ? `· ${d.source_year}` : ""} · {d.file_size ? `${Math.round(d.file_size/1024)} KB` : ""}</div>
                </div>
                <Chip tone={d.status === "extracted" ? "mint" : d.status === "extraction_failed" ? "ink" : "sun"}>{d.status}</Chip>
              </div>
              {d.description && <div className="text-sm text-ink-500">{d.description}</div>}
              {d.extraction_error && <div className="text-sm text-red-500">{d.extraction_error}</div>}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={() => runExtract(d.id)} disabled={pendingId===d.id}>{pendingId===d.id ? <Loader2 className="h-4 w-4 animate-spin"/> : (d.status==="uploaded"?<Play className="h-4 w-4"/>:<RotateCcw className="h-4 w-4"/>)} {d.status==="uploaded"?"Extract":"Retry"}</Button>
                <Button size="sm" variant="secondary" onClick={() => openOriginal(d.id)} disabled={pendingId===d.id}><Eye className="h-4 w-4"/> Original</Button>
                <Button size="sm" variant="secondary" onClick={() => loadExtraction(d.id)} disabled={pendingId===d.id}><FileText className="h-4 w-4"/> Extracted</Button>
                <Button size="sm" variant="secondary" onClick={() => copyPrompt(d.id)}><Wand2 className="h-4 w-4"/> Prompt</Button>
                <Button size="sm" variant="ghost" onClick={() => downloadText(d.id)}><Copy className="h-4 w-4"/> Text</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(d.id)} disabled={pendingId===d.id}><Trash2 className="h-4 w-4"/> Delete</Button>
              </div>
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {!preview ? (
            <Card className="p-6 text-sm font-semibold text-ink-400">Select a document to view the original or extracted text.</Card>
          ) : preview.url ? (
            <Card className="flex flex-col gap-2 p-3">
              <div className="font-extrabold text-ink-700">Original: {preview.name}</div>
              {preview.mime?.includes("pdf") ? (
                <iframe src={preview.url} className="h-[70vh] w-full rounded-xl border" title="Original document" />
              ) : preview.mime?.startsWith("image/") ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.url} alt={preview.name || "Original"} className="max-h-[70vh] w-full rounded-xl object-contain" />
                </>
              ) : (
                <a href={preview.url} target="_blank" rel="noreferrer" className="text-lav-500 underline">Open original document</a>
              )}
            </Card>
          ) : (
            <Card className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2"><div className="font-extrabold text-ink-700">Extracted text: {preview.name}</div>
                <Button size="sm" onClick={saveExtractionText} disabled={!preview.extractionId || pendingId===preview.id}>Save edits</Button>
              </div>
              <textarea className="h-[70vh] w-full rounded-xl border-2 border-cream-300 p-3 font-mono text-xs" value={preview.text ?? ""} onChange={(e)=>setPreview(p=>p?{...p,text:e.target.value}:p)} />
              <p className="text-xs text-ink-400">Edit extracted content if needed, then save. Tables/diagrams/scanned regions may require manual review against the original (preserved in storage).</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

