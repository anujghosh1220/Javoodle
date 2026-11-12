"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, FileText } from "lucide-react";
import { uploadDocuments } from "@/app/actions/admin-documents";
import { Button } from "@/components/ui/Button";

const ACCEPT =
  ".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg";

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const valid = Array.from(list).filter((f) => {
      const okType = /\.(pdf|docx|png|jpe?g)$/i.test(f.name) ||
        ["application/pdf", "image/png", "image/jpeg",
         "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type);
      if (!okType) { setError(`${f.name}: unsupported type`); return false; }
      if (f.size > 8 * 1024 * 1024) { setError(`${f.name}: over 8 MB`); return false; }
      return true;
    });
    setFiles((prev) => [...prev, ...valid].slice(0, 10));
    setError(null);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true); setError(null);
    const fd = new FormData(e.currentTarget);
    files.forEach((f) => fd.append("files", f));
    const res = await uploadDocuments(fd);
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Upload failed"); return; }
    setDone(res.uploaded ?? files.length);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ink-400">
          Source year
          <input name="source_year" type="number" min={2000} max={2030} placeholder="2024"
            className="rounded-xl border-2 border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold normal-case text-ink-800 focus:border-lav-300 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ink-400">
          Source type
          <select name="source_type" className="rounded-xl border-2 border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold normal-case text-ink-800 focus:border-lav-300 focus:outline-none">
            <option value="">—</option>
            <option value="pyq">Previous Year Paper</option>
            <option value="specimen">Specimen Paper</option>
            <option value="school">School Paper</option>
            <option value="notes">Notes</option>
            <option value="marking_scheme">Marking Scheme</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ink-400">
          Description
          <input name="description" type="text" placeholder="ICSE 2024 Computer Apps"
            className="rounded-xl border-2 border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold normal-case text-ink-800 focus:border-lav-300 focus:outline-none" />
        </label>
      </div>

      <button type="button" onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-lav-300 bg-lav-50/60 px-6 py-10 text-center transition-colors hover:bg-lav-50">
        <UploadCloud className="h-10 w-10 text-lav-400" />
        <p className="font-bold text-ink-600">Drop papers here or click to browse</p>
        <p className="text-xs font-semibold text-ink-400">PDF, DOCX, PNG, JPG · max 8 MB each · up to 10 files</p>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={(e) => addFiles(e.target.files)} />
      </button>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2 text-sm font-semibold text-ink-600">
              <FileText className="h-4 w-4 text-lav-400" /> {f.name}
              <span className="ml-auto text-xs text-ink-400">{(f.size / 1024).toFixed(0)} KB</span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm font-semibold text-red-500" role="alert">{error}</p>}
      {done !== null && <p className="text-sm font-semibold text-mint-600">✓ {done} document(s) uploaded.</p>}

      <div>
        <Button type="submit" disabled={busy || files.length === 0}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UploadCloud className="h-5 w-5" /> Upload {files.length || ""}</>}
        </Button>
      </div>
    </form>
  );
}
