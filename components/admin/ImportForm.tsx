"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { previewImport, importQuestions } from "@/app/actions/admin-questions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const AI_PROMPT = `You are an expert ICSE Class 10 Computer Applications (Java) paper analyzer.

Analyze the document below and output ONLY a JSON object of this exact shape:
{
  "questions": [
    {
      "question_text": "verbatim question wording",
      "question_type": "mcq|fill_blank|true_false|output_prediction|find_error|theory|coding",
      "marks": 2,
      "topic_names": ["Arrays", "Strings"],
      "difficulty": 1,
      "options": [{"label":"A","text":"..."}],
      "correct_option": "A",
      "proposed_answer": "concise answer",
      "model_answer": "full model answer",
      "reference_solution": "complete Java program if coding",
      "explanation": "why this is correct",
      "test_cases": [{"input":"","expected_output":"","is_hidden":true}],
      "marking_rubric": [{"criteria":"...","max_marks":2,"keywords":["..."]}],
      "source_year": 2024,
      "source_page": 1,
      "source_question_number": "1(a)",
      "subquestions": []
    }
  ]
}

Rules:
- Extract EVERY question and subquestion; preserve original wording, marks and numbering.
- Map topics to the ICSE Class 10 Java syllabus (Variables, Operators, Conditionals, Loops, Classes & Objects, Methods, Constructors, Overloading, Library Classes, Strings, Arrays, Searching & Sorting).
- MCQs need options + correct_option. Coding questions need reference_solution + test_cases.
- Marking rubric max_marks must sum to the question's marks.
- Flag ambiguous/unreadable content in "extra": {"flags": [...]} — never invent questions or marks.
- Distinguish source-derived facts from your proposed answers.`;

export function ImportForm({ extractedText }: { extractedText?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewImport>> | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function doPreview() {
    setBusy("preview"); setResult(null);
    const res = await previewImport(raw);
    setPreview(res);
    setBusy(null);
  }

  async function doImport() {
    setBusy("import"); setResult(null);
    const res = await importQuestions(raw);
    setBusy(null);
    if (!res.ok) { setResult(`Import failed: ${res.error}`); return; }
    setResult(`✓ Imported ${res.imported} questions as pending review.`);
    setRaw(""); setPreview(null);
    router.refresh();
  }

  function copyPrompt() {
    navigator.clipboard.writeText(
      extractedText ? `${AI_PROMPT}\n\n--- DOCUMENT ---\n${extractedText}` : AI_PROMPT
    );
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  function downloadExtracted() {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "extracted-document.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-extrabold text-ink-700">1 · Paste or upload JSON</h2>
        <textarea
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setPreview(null); setResult(null); }}
          placeholder='{"questions": [ ... ]}'
          className="h-64 w-full rounded-xl border-2 border-cream-300 bg-white p-3 font-mono text-xs text-ink-700 focus:border-lav-300 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={doPreview} disabled={busy !== null || !raw.trim()}>
            {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
          </Button>
          <Button size="sm" variant="mint" onClick={doImport}
            disabled={busy !== null || !preview?.ok}>
            {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            Load .json file
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setRaw(await f.text());
              e.target.value = "";
            }} />
        </div>
        {result && <p className="text-sm font-semibold text-ink-600">{result}</p>}
        {preview && !preview.ok && (
          <div className="max-h-56 overflow-auto rounded-xl bg-red-50 p-3">
            <p className="mb-1 flex items-center gap-1 text-sm font-bold text-red-600">
              <AlertTriangle className="h-4 w-4" /> {preview.errors?.length} validation issue(s)
            </p>
            <ul className="space-y-1 text-xs font-semibold text-red-500">
              {preview.errors?.slice(0, 20).map((er, i) => (
                <li key={i}>Q{er.index >= 0 ? er.index + 1 : ""}{er.field ? `.${er.field}` : ""}: {er.message}</li>
              ))}
            </ul>
          </div>
        )}
        {preview?.ok && (
          <div className="rounded-xl bg-mint-50 p-3 text-sm font-semibold text-mint-700">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            {preview.count} question(s) valid — ready to import as pending review.
            {preview.duplicates?.length ? ` ⚠ ${preview.duplicates.length} possible duplicates.` : ""}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-extrabold text-ink-700">2 · AI analysis prompt</h2>
        <p className="text-xs font-semibold text-ink-400">
          Copy this prompt + your extracted document text into ChatGPT, then paste
          the JSON it returns on the left.
        </p>
        <pre className="max-h-48 overflow-auto rounded-xl bg-ink-900 p-3 text-[11px] leading-relaxed text-mint-100">
          {AI_PROMPT}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={copyPrompt}>
            {copied ? "Copied!" : <><Copy className="h-4 w-4" /> Copy prompt{extractedText ? " + document" : ""}</>}
          </Button>
          {extractedText && (
            <Button size="sm" variant="secondary" onClick={downloadExtracted}>
              <Download className="h-4 w-4" /> Download extracted text
            </Button>
          )}
        </div>
        {!extractedText && (
          <p className="text-xs font-semibold text-ink-400">
            Tip: open a document&apos;s extracted text on the Documents page and
            pass it here, or paste it manually after copying the prompt.
          </p>
        )}
      </Card>
    </div>
  );
}
