import "server-only";
import { MAX_OUTPUT_LENGTH, MAX_STDIN_LENGTH, MAX_SOURCE_LENGTH } from "./shared";

/**
 * Java execution engine — OnlineCompiler.io provider.
 *
 * SECURITY: student code is NEVER executed in this process. Execution is
 * delegated to api.onlinecompiler.io over HTTPS. The API key is read from
 * ONLINECOMPILER_API_KEY on the server only and is never exposed to clients,
 * props, logs or API responses.
 *
 * If the key is missing the engine returns status "unavailable" — Run Code
 * shows a clear message and submissions are blocked until a successful run
 * exists (a successful run cannot be forged; see coding-student.ts).
 */

export interface ExecResult {
  ok: boolean;
  status: "success" | "compile_error" | "runtime_error" | "time_limit" | "unavailable" | "error";
  stdout: string;
  stderr: string;
  compileError: string | null;
  runtimeError: string | null;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  exitCode: number | null;
  error?: string;
}

const PROVIDER = "https://api.onlinecompiler.io";
const COMPILER = "openjdk-25";
const TIME_LIMIT_SECONDS = 10;
const HTTP_TIMEOUT_MS = 30_000;

const clip = (s: string | null | undefined, n = MAX_OUTPUT_LENGTH) =>
  (s ?? "").slice(0, n);

export function executorConfigured(): boolean {
  return Boolean(process.env.ONLINECOMPILER_API_KEY);
}

interface ProviderResponse {
  output?: unknown;
  error?: unknown;
  status?: unknown;
  exit_code?: unknown;
  time?: unknown;
  total?: unknown;
  memory?: unknown;
  truncated?: unknown;
}

function unavailable(reason: string): ExecResult {
  return {
    ok: false, status: "unavailable", stdout: "", stderr: "",
    compileError: null, runtimeError: reason,
    executionTimeMs: null, memoryUsedKb: null, exitCode: null,
  };
}

function failure(status: ExecResult["status"], message: string, extra?: Partial<ExecResult>): ExecResult {
  return {
    ok: false, status, stdout: "", stderr: "",
    compileError: null, runtimeError: message,
    executionTimeMs: null, memoryUsedKb: null, exitCode: null,
    ...extra,
  };
}

export async function executeJava(source: string, stdin: string): Promise<ExecResult> {
  if (!source.trim()) return failure("error", "Source code is empty.");
  if (source.length > MAX_SOURCE_LENGTH) {
    return failure("error", "Source code is too large.");
  }
  if (stdin.length > MAX_STDIN_LENGTH) {
    return failure("error", "Standard input is too large.");
  }

  const apiKey = process.env.ONLINECOMPILER_API_KEY;
  if (!apiKey) {
    return unavailable(
      "Java execution is not configured on this server (OnlineCompiler API key missing). Ask your teacher to enable the execution service."
    );
  }

  let res: Response;
  try {
    res = await fetch(`${PROVIDER}/api/run-code-sync/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        compiler: COMPILER,
        code: source,
        input: stdin,
        time_limit: TIME_LIMIT_SECONDS,
      }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch (e) {
    const isTimeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return failure(isTimeout ? "time_limit" : "error",
      isTimeout ? "Execution timed out (30s safeguard)." : "Could not reach the execution service.");
  }

  // Provider-level HTTP errors — never report as success.
  if (res.status === 401 || res.status === 403) {
    return failure("error", "Execution service rejected the server credentials — contact your teacher.");
  }
  if (res.status === 429) {
    return failure("error", "Execution quota reached — please try again later.");
  }
  if (!res.ok) {
    return failure("error", `Execution service error (${res.status}).`);
  }

  let j: ProviderResponse;
  try {
    j = (await res.json()) as ProviderResponse;
  } catch {
    return failure("error", "Execution service returned an unreadable response.");
  }
  if (typeof j !== "object" || j === null) {
    return failure("error", "Execution service returned an invalid response.");
  }

  const stdout = clip(typeof j.output === "string" ? j.output : "");
  const providerError = typeof j.error === "string" && j.error.trim() ? j.error : null;
  const toNum = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const exitCode = toNum(j.exit_code);
  const statusText = typeof j.status === "string" ? j.status.toLowerCase() : "";
  const timeSec = toNum(j.time);
  const totalSec = toNum(j.total);
  const executionTimeMs =
    timeSec !== null ? Math.round(timeSec * 1000)
    : totalSec !== null ? Math.round(totalSec * 1000)
    : null;
  const memoryUsedKb = toNum(j.memory);

  // Compile vs runtime: javac-style diagnostics in the error text indicate a
  // compilation failure; anything else with a non-zero exit is runtime.
  const compilePattern =
    /cannot find symbol|';' expected|illegal start|not a statement|incompatible types|unreported exception|reached end of file|class\s+\w+\s+is public|duplicate class|\) expected|\.class' expected|unclosed/i;
  const compileFailed = !!providerError && compilePattern.test(providerError) && exitCode !== 0;
  const timedOut = statusText.includes("time") || statusText.includes("timeout") || /time limit/i.test(providerError ?? "");
  const runtimeFailed = (exitCode !== null && exitCode !== 0) || !!providerError || statusText === "error" || statusText === "failed";

  if (compileFailed) {
    return {
      ok: false, status: "compile_error", stdout: "", stderr: "",
      compileError: clip(providerError ?? stdout ?? "Compilation failed.", 8000),
      runtimeError: null, executionTimeMs, memoryUsedKb, exitCode,
    };
  }
  if (timedOut) {
    return {
      ok: false, status: "time_limit", stdout: clip(stdout), stderr: "",
      compileError: null, runtimeError: providerError ?? "Execution exceeded the time limit.",
      executionTimeMs, memoryUsedKb, exitCode,
    };
  }
  if (runtimeFailed || providerError) {
    return {
      ok: false, status: "runtime_error", stdout: clip(stdout), stderr: "",
      compileError: null, runtimeError: clip(providerError ?? `Program exited with code ${exitCode}.`, 8000),
      executionTimeMs, memoryUsedKb, exitCode,
    };
  }

  return {
    ok: true, status: "success", stdout: clip(stdout), stderr: "",
    compileError: null, runtimeError: null,
    executionTimeMs, memoryUsedKb, exitCode,
  };
}
