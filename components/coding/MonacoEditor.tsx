"use client";

/**
 * Browser-only Monaco bootstrap.
 *
 * This module is ONLY ever loaded through next/dynamic with `ssr: false`,
 * so `monaco-editor` (which touches `window` at import time) is never
 * evaluated during server rendering. Because both CodingWorkspace and
 * PlaygroundWorkspace import this same module, Monaco and the worker
 * environment are initialized exactly once per browser session.
 */
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorComponent from "@monaco-editor/react";

// Local web worker for editor services (completions, links, etc.) — bundled
// by Turbopack from monaco-editor's own ESM worker entry. Without this,
// Monaco falls back to running worker code on the main thread.
const g = globalThis as { MonacoEnvironment?: unknown };
if (!g.MonacoEnvironment) {
  g.MonacoEnvironment = {
    getWorker: () =>
      new Worker(
        new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url),
        { type: "module" }
      ),
  };
}

loader.config({ monaco });

export const MonacoEditor = EditorComponent;
