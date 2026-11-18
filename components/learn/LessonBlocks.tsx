import { Lightbulb, AlertTriangle, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonBlock } from "@/lib/learn/types";

function InlineCode({ text }: { text: string }) {
  // Render `backtick` spans as inline code.
  const parts = text.split(/`([^`]+)`/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded-md bg-cream-200 px-1.5 py-0.5 font-mono text-[0.85em] font-bold text-lav-600">
            {p}
          </code>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

const noteTones = {
  info: { icon: Lightbulb, cls: "border-lav-300/60 bg-lav-50 text-ink-600", iconCls: "text-lav-500" },
  exam: { icon: GraduationCap, cls: "border-sun-300/70 bg-sun-50 text-ink-700", iconCls: "text-sun-500" },
  warning: { icon: AlertTriangle, cls: "border-red-300/60 bg-red-50 text-ink-700", iconCls: "text-red-400" },
} as const;

export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return (
              <h2 key={i} className="pt-2 text-xl font-extrabold tracking-tight text-ink-800">
                {b.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="text-[15px] font-medium leading-relaxed text-ink-600">
                <InlineCode text={b.text} />
              </p>
            );
          case "code":
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-cream-300/70 bg-[#1e1e1e]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500">{b.language ?? "java"}</span>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-neutral-200"><code>{b.code}</code></pre>
              </div>
            );
          case "output":
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-mint-300/50 bg-mint-50">
                <p className="border-b border-mint-300/40 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-mint-600">Output</p>
                {b.code && (
                  <pre className="overflow-x-auto border-b border-mint-300/30 bg-[#1e1e1e] p-4 font-mono text-[13px] text-neutral-200"><code>{b.code}</code></pre>
                )}
                <pre className="overflow-x-auto p-4 font-mono text-[13px] font-bold text-ink-700"><code>{b.output}</code></pre>
              </div>
            );
          case "note": {
            const tone = noteTones[b.tone ?? "info"];
            const Icon = tone.icon;
            return (
              <div key={i} className={cn("flex gap-3 rounded-2xl border-l-4 p-4", tone.cls)}>
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone.iconCls)} />
                <p className="text-sm font-semibold leading-relaxed">
                  <InlineCode text={b.text} />
                </p>
              </div>
            );
          }
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={cn("flex flex-col gap-2 pl-1 text-[15px] font-medium text-ink-600", b.ordered ? "list-decimal" : "list-disc")}>
                {b.items.map((item, j) => (
                  <li key={j} className={b.ordered ? "ml-5" : "ml-6"}>
                    <InlineCode text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "keypoint":
            return (
              <div key={i} className="rounded-2xl border-2 border-dashed border-lav-300/60 bg-lav-50/60 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-lav-500">Exam tip</p>
                <p className="mt-1 text-sm font-bold text-ink-700">
                  <InlineCode text={b.text} />
                </p>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
