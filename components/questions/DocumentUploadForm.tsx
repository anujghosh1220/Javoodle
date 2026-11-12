/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { uploadDocumentsAction } from "@/app/actions/question-studio";
import { DOCUMENT_SOURCE_TYPE_LABELS } from "@/lib/storage/documents";

export function DocumentUploadForm() {
  const [pending, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);
  const [sourceYear, setSourceYear] = useState("");
  const [sourceType, setSourceType] = useState("other");
  const [description, setDescription] = useState("");
  const [results, setResults] = useState<any[]>([]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...list]);
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...list]);
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit() {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    fd.set("source_year", sourceYear);
    fd.set("source_type", sourceType);
    fd.set("description", description);
    startTransition(async () => {
      const res = await uploadDocumentsAction(fd);
      setResults(res.results ?? []);
      if (res.ok && files.length) {
        // keep files to show results; optionally redirect after short delay
      }
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-50/60 px-6 py-10 text-center"
      >
        <UploadCloud className="h-8 w-8 text-lav-400" />
        <p className="font-bold text-ink-700">Drag &amp; drop PDF, DOCX, PNG, or JPG files</p>
        <p className="text-sm text-ink-400">or select files from your device</p>
        <label className="mt-2">
          <input type="file" multiple accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" onChange={onSelect} className="hidden" />
          <span className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-700 border-2 border-cream-300 hover:border-lav-300">Select files</span>
        </label>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border-2 border-cream-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-ink-400" />
                <span className="text-sm font-semibold text-ink-700">{f.name}</span>
                <span className="text-xs text-ink-400">{Math.round(f.size / 1024)} KB</span>
              </div>
              <button onClick={() => removeFile(i)} className="text-xs font-bold text-ink-400 hover:text-red-500">Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Source year</span>
          <input value={sourceYear} onChange={(e) => setSourceYear(e.target.value)} placeholder="e.g. 2024" className="rounded-xl border-2 border-cream-300 px-3 py-2 font-semibold text-ink-800" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Source type</span>
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="rounded-xl border-2 border-cream-300 px-3 py-2 font-semibold text-ink-800">
            {Object.entries(DOCUMENT_SOURCE_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Description (optional)</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes about this document" className="rounded-xl border-2 border-cream-300 px-3 py-2 font-semibold text-ink-800" />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={pending || files.length === 0}>
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <>Upload documents</>}
        </Button>
        {results.length > 0 && <Chip tone="mint">{results.filter(r=>r.id).length}/{results.length} uploaded</Chip>}
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          {results.map((r,i) => (
            <div key={i} className={r.error ? "text-red-500" : "text-ink-600"}>{r.name}: {r.error ? r.error : "Uploaded"}</div>
          ))}
        </div>
      )}
    </Card>
  );
}

