"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import {
  prepareExamDraftAction,
  saveExamStructureAction,
  updateExamDetailsAction,
} from "@/app/actions/exam-admin";
import {
  PAPER_QUESTION_TYPES,
  PAPER_QUESTION_TYPE_LABELS,
  type ExamDraft,
  type DraftQuestion,
  type PaperQuestionType,
} from "@/lib/exams/shared";
import { Sparkles, AlertTriangle, CheckCircle2, X } from "lucide-react";

const inputCls =
  "w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300";

export function ExamDraftReview({
  examId,
  hasPaper,
  frozen,
}: {
  examId: string;
  hasPaper: boolean;
  frozen: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"prepare" | "save" | "apply" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState<ExamDraft | null>(null);
  const [appliedMeta, setAppliedMeta] = useState(false);

  const achievable = useMemo(() => {
    if (!draft) return 0;
    let total = 0;
    const groupByKey = new Map(draft.optional_groups.map((g) => [g.key, g]));
    for (const q of draft.questions) {
      if (!q.optional_group_key || !groupByKey.has(q.optional_group_key)) {
        total += q.marks ?? 0;
      }
    }
    for (const g of draft.optional_groups) total += g.max_counted_marks;
    return Math.round(total * 100) / 100;
  }, [draft]);

  const missingMarks = draft?.questions.filter((q) => q.marks === null).length ?? 0;
  const canSave = !!draft && draft.questions.length > 0 && missingMarks === 0;

  async function prepare() {
    setBusy("prepare");
    setMsg(null);
    const res = await prepareExamDraftAction(examId);
    setBusy(null);
    if (!res.ok || !res.draft) {
      setMsg({ ok: false, text: res.error ?? "Extraction failed." });
      return;
    }
    setDraft(res.draft);
    setAppliedMeta(false);
    setMsg({
      ok: true,
      text: `Extracted ${res.draft.questions.length} questions, ${res.draft.sections.length} sections${res.draft.optional_groups.length ? `, ${res.draft.optional_groups.length} optional group(s)` : ""}. Review below, then save.`,
    });
  }

  function patchQuestion(key: string, patch: Partial<DraftQuestion>) {
    setDraft((d) =>
      d ? { ...d, questions: d.questions.map((q) => (q.key === key ? { ...q, ...patch } : q)) } : d
    );
  }

  function patchGroup(key: string, patch: Partial<ExamDraft["optional_groups"][number]>) {
    setDraft((d) =>
      d
        ? { ...d, optional_groups: d.optional_groups.map((g) => (g.key === key ? { ...g, ...patch } : g)) }
        : d
    );
  }

  function removeQuestion(key: string) {
    setDraft((d) => (d ? { ...d, questions: d.questions.filter((q) => q.key !== key) } : d));
  }

  function addQuestion(sectionKey: string) {
    setDraft((d) => {
      if (!d) return d;
      const n = d.questions.filter((q) => q.section_key === sectionKey).length + 1;
      return {
        ...d,
        questions: [
          ...d.questions,
          {
            key: `qnew${Date.now().toString(36)}`,
            section_key: sectionKey,
            optional_group_key: null,
            question_number: String(n),
            prompt: "",
            question_type: "theory" as PaperQuestionType,
            marks: 2,
            options: [],
            warnings: [],
          },
        ],
      };
    });
  }

  async function applyMeta() {
    if (!draft) return;
    setBusy("apply");
    const m = draft.meta;
    const res = await updateExamDetailsAction(examId, {
      title: m.title ?? "",
      subject: m.subject ?? "",
      class_name: m.class_name ?? "",
      description: null,
      instructions: m.instructions,
      duration_minutes: m.duration_minutes ?? 0,
      reading_time_minutes: m.reading_time_minutes ?? 0,
      total_marks: m.total_marks ?? achievable,
      passing_marks: null,
      opens_at: null,
      closes_at: null,
      release_model_answers: false,
    });
    setBusy(null);
    if (res.ok) {
      setAppliedMeta(true);
      setMsg({ ok: true, text: "Detected details applied to the exam (review the details form — availability dates were preserved only if unchanged)." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.error ?? "Could not apply details." });
    }
  }

  async function save() {
    if (!draft) return;
    setBusy("save");
    setMsg(null);
    const payload = {
      sections: draft.sections.map((s, i) => ({ key: s.key, title: s.title, order_index: i })),
      optional_groups: draft.optional_groups.map((g, i) => ({
        key: g.key,
        title: g.title,
        pick_count: g.pick_count,
        max_counted_marks: g.max_counted_marks,
        order_index: i,
      })),
      questions: draft.questions.map((q) => ({
        section_key: q.section_key,
        optional_group_key: q.optional_group_key,
        question_number: q.question_number,
        prompt: q.prompt,
        question_type: q.question_type,
        marks: q.marks ?? 1,
        options: q.question_type === "mcq" ? q.options : [],
        model_answer: null,
      })),
    };
    const res = await saveExamStructureAction(examId, JSON.stringify(payload));
    setBusy(null);
    if (res.ok) {
      setMsg({ ok: true, text: "Draft saved as the exam structure. You can now publish." });
      setDraft(null);
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.error ?? "Save failed." });
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-extrabold text-ink-700">
            <Sparkles className="h-5 w-5 text-lav-500" /> Prepare exam from PDF
          </h2>
          <p className="mt-1 text-xs font-semibold text-ink-400">
            Extracts the uploaded paper locally (no external AI) into an editable draft.
            Nothing is saved until you confirm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!draft && (
            <Button size="sm" onClick={prepare} disabled={busy !== null || !hasPaper || frozen}>
              {busy === "prepare" ? "Reading PDF…" : "Prepare Exam from PDF"}
            </Button>
          )}
          {draft && (
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              <X className="h-4 w-4" /> Discard draft
            </Button>
          )}
        </div>
      </div>
      {!hasPaper && (
        <p className="text-sm font-semibold text-ink-400">Upload the question paper PDF above first.</p>
      )}
      {frozen && (
        <p className="text-sm font-semibold text-sun-500">Structure is frozen — attempts exist.</p>
      )}
      {msg && (
        <p className={`rounded-xl px-4 py-2 text-sm font-bold ${msg.ok ? "bg-mint-100 text-mint-600" : "bg-red-500/10 text-red-400"}`}>
          {msg.text}
        </p>
      )}

      {draft && (
        <div className="flex flex-col gap-4">
          {/* Meta suggestions */}
          <div className="rounded-2xl bg-lav-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-ink-700">Detected paper details</h3>
              <Button size="sm" variant="secondary" onClick={applyMeta} disabled={busy !== null || appliedMeta}>
                {appliedMeta ? "Applied" : "Apply to exam details"}
              </Button>
            </div>
            <div className="mt-2 grid gap-2 text-sm font-semibold text-ink-600 sm:grid-cols-2 lg:grid-cols-3">
              <div>Title: <span className="font-bold text-ink-800">{draft.meta.title ?? "—"}</span></div>
              <div>Subject: <span className="font-bold text-ink-800">{draft.meta.subject ?? "—"}</span></div>
              <div>Class: <span className="font-bold text-ink-800">{draft.meta.class_name ?? "—"}</span></div>
              <div>Duration: <span className="font-bold text-ink-800">{draft.meta.duration_minutes ?? "—"} min</span></div>
              <div>Reading: <span className="font-bold text-ink-800">{draft.meta.reading_time_minutes ?? "—"} min</span></div>
              <div>Marks: <span className="font-bold text-ink-800">{draft.meta.total_marks ?? "—"}</span></div>
            </div>
            {draft.meta.instructions && (
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap rounded-xl bg-cream-200 p-3 text-xs font-semibold text-ink-500">
                {draft.meta.instructions}
              </p>
            )}
          </div>

          {/* Warnings */}
          {(draft.warnings.length > 0 || draft.unparsedBlocks.length > 0) && (
            <div className="rounded-2xl border-2 border-sun-300 bg-sun-100/50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink-700">
                <AlertTriangle className="h-4 w-4 text-sun-500" /> Review needed
              </h3>
              <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-ink-600">
                {draft.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
              {draft.unparsedBlocks.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-bold text-ink-400">
                    {draft.unparsedBlocks.length} unparsed text block(s) — verify nothing was missed
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-cream-200 p-3 text-xs text-ink-500">
                    {draft.unparsedBlocks.join("\n---\n")}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Optional groups */}
          {draft.optional_groups.length > 0 && (
            <div className="rounded-2xl border-2 border-mint-300 bg-mint-50/50 p-4">
              <h3 className="text-sm font-extrabold text-ink-700">Optional question rules</h3>
              <div className="mt-2 flex flex-col gap-3">
                {draft.optional_groups.map((g) => (
                  <div key={g.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-cream-200 p-3">
                    <input
                      className={`${inputCls} max-w-xs font-extrabold`}
                      value={g.title}
                      onChange={(e) => patchGroup(g.key, { title: e.target.value })}
                    />
                    <label className="flex items-center gap-1 text-xs font-bold text-ink-500">
                      Attempt any
                      <input
                        type="number" min={1}
                        className={`${inputCls} w-16`}
                        value={g.pick_count}
                        onChange={(e) => patchGroup(g.key, { pick_count: Number(e.target.value) })}
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs font-bold text-ink-500">
                      Max counted marks
                      <input
                        type="number" min={0.5} step={0.5}
                        className={`${inputCls} w-24`}
                        value={g.max_counted_marks}
                        onChange={(e) => patchGroup(g.key, { max_counted_marks: Number(e.target.value) })}
                      />
                    </label>
                    <span className="text-xs font-bold text-ink-400">
                      {draft.questions.filter((q) => q.optional_group_key === g.key).length} member questions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="flex flex-col gap-4">
            {draft.sections.map((s) => {
              const secQs = draft.questions.filter((q) => q.section_key === s.key);
              return (
                <div key={s.key} className="rounded-2xl border-2 border-cream-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className={`${inputCls} max-w-xs font-extrabold`}
                      value={s.title}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, sections: d.sections.map((x) => (x.key === s.key ? { ...x, title: e.target.value } : x)) } : d
                        )
                      }
                    />
                    <span className="text-xs font-bold text-ink-400">
                      {secQs.length} questions · {secQs.reduce((a, q) => a + (q.marks ?? 0), 0)} marks available
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {secQs.map((q) => (
                      <div key={q.key} className="rounded-xl bg-cream-50 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className={`${inputCls} w-20`}
                            value={q.question_number}
                            onChange={(e) => patchQuestion(q.key, { question_number: e.target.value })}
                            placeholder="No."
                          />
                          <select
                            className={`${inputCls} w-36`}
                            value={q.question_type}
                            onChange={(e) => patchQuestion(q.key, { question_type: e.target.value as PaperQuestionType })}
                          >
                            {PAPER_QUESTION_TYPES.map((t) => (
                              <option key={t} value={t}>{PAPER_QUESTION_TYPE_LABELS[t]}</option>
                            ))}
                          </select>
                          <input
                            type="number" min={0.5} step={0.5}
                            className={`${inputCls} w-20 ${q.marks === null ? "border-red-300" : ""}`}
                            value={q.marks ?? ""}
                            onChange={(e) => patchQuestion(q.key, { marks: e.target.value === "" ? null : Number(e.target.value) })}
                            placeholder="marks"
                          />
                          {draft.optional_groups.length > 0 && (
                            <select
                              className={`${inputCls} w-44`}
                              value={q.optional_group_key ?? ""}
                              onChange={(e) => patchQuestion(q.key, { optional_group_key: e.target.value || null })}
                            >
                              <option value="">Compulsory</option>
                              {draft.optional_groups.map((g) => (
                                <option key={g.key} value={g.key}>{g.title}</option>
                              ))}
                            </select>
                          )}
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeQuestion(q.key)} className="ml-auto text-red-500">
                            Remove
                          </Button>
                        </div>
                        <textarea
                          className={`${inputCls} mt-2`}
                          rows={2}
                          value={q.prompt}
                          onChange={(e) => patchQuestion(q.key, { prompt: e.target.value })}
                        />
                        {q.question_type === "mcq" && q.options.length > 0 && (
                          <p className="mt-1 text-xs font-bold text-ink-400">
                            {q.options.length} options: {q.options.map((o) => o.label).join(", ")}
                          </p>
                        )}
                        {q.warnings.length > 0 && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-sun-500">
                            <AlertTriangle className="h-3 w-3" /> {q.warnings.join(" ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button type="button" size="sm" variant="secondary" onClick={() => addQuestion(s.key)}>
                      Add question
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-cream-50 p-4">
            <Chip tone={canSave ? "mint" : "sun"}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Achievable marks: {achievable}
              {missingMarks > 0 && ` · ${missingMarks} question(s) missing marks`}
            </Chip>
            <Button onClick={save} disabled={busy !== null || !canSave}>
              {busy === "save" ? "Saving…" : "Save extracted structure"}
            </Button>
            <p className="text-xs font-semibold text-ink-400">
              Saving replaces the current question structure (only while no attempts exist).
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
