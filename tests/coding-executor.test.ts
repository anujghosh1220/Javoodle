import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { executeJava, executorConfigured } from "@/lib/coding/executor";
import { sha256Hex } from "@/lib/coding/shared";

const KEY = "test-api-key";

function mockResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  process.env.ONLINECOMPILER_API_KEY = KEY;
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ONLINECOMPILER_API_KEY;
});

describe("executorConfigured", () => {
  it("false without key, true with key", () => {
    delete process.env.ONLINECOMPILER_API_KEY;
    expect(executorConfigured()).toBe(false);
    process.env.ONLINECOMPILER_API_KEY = KEY;
    expect(executorConfigured()).toBe(true);
  });
});

describe("executeJava — provider mocking", () => {
  it("missing key → unavailable, no fetch", async () => {
    delete process.env.ONLINECOMPILER_API_KEY;
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const r = await executeJava("class Main {}", "");
    expect(r.status).toBe("unavailable");
    expect(r.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("successful execution → success with stdout/time", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse(200, {
      output: "Hello Javoodle\n", error: "", status: "success", exit_code: 0,
      time: 0.05, total: 0.4, memory: 12000, truncated: false,
    })));
    const r = await executeJava("class Main {}", "");
    expect(r.ok).toBe(true);
    expect(r.status).toBe("success");
    expect(r.stdout).toBe("Hello Javoodle\n");
    expect(r.executionTimeMs).toBe(50);
    expect(r.memoryUsedKb).toBe(12000);
    expect(r.exitCode).toBe(0);
  });

  it("sends compiler id, code, input and time limit correctly", async () => {
    const spy = vi.fn(async () => mockResponse(200, { output: "ok", status: "success", exit_code: 0 }));
    vi.stubGlobal("fetch", spy);
    await executeJava("SRC", "my-stdin");
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.onlinecompiler.io/api/run-code-sync/");
    expect((init.headers as Record<string, string>).Authorization).toBe(KEY);
    const body = JSON.parse(String(init.body));
    expect(body.compiler).toBe("openjdk-25");
    expect(body.code).toBe("SRC");
    expect(body.input).toBe("my-stdin");
    expect(body.time_limit).toBe(10);
  });

  it("compilation error mapped", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse(200, {
      output: "", error: "Main.java:3: error: ';' expected", status: "error", exit_code: 1,
    })));
    const r = await executeJava("bad code", "");
    expect(r.status).toBe("compile_error");
    expect(r.ok).toBe(false);
    expect(r.compileError).toContain("';' expected");
  });

  it("runtime error mapped", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse(200, {
      output: "partial", error: "Exception in thread main java.lang.ArithmeticException", status: "error", exit_code: 1,
    })));
    const r = await executeJava("crash", "");
    expect(r.status).toBe("runtime_error");
    expect(r.ok).toBe(false);
    expect(r.stdout).toBe("partial");
  });

  it("time limit mapped", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse(200, {
      output: "", error: "time limit exceeded", status: "timeout", exit_code: -1,
    })));
    const r = await executeJava("while(true){}", "");
    expect(r.status).toBe("time_limit");
    expect(r.ok).toBe(false);
  });

  it("HTTP 401 and 429 handled as errors, never success", async () => {
    for (const code of [401, 429]) {
      vi.stubGlobal("fetch", vi.fn(async () => mockResponse(code, {})));
      const r = await executeJava("x", "");
      expect(r.ok).toBe(false);
      expect(r.status).toBe("error");
    }
  });

  it("malformed JSON handled", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json{{{", { status: 200 })));
    const r = await executeJava("x", "");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("error");
  });

  it("network timeout handled", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("The operation timed out", "TimeoutError"); }));
    const r = await executeJava("x", "");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("time_limit");
  });

  it("empty and oversized source rejected before provider call", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect((await executeJava("   ", "")).ok).toBe(false);
    expect((await executeJava("x".repeat(50001), "")).ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("source hash validation (submit gate)", () => {
  it("hash is stable; changed code produces different hash", () => {
    const h1 = sha256Hex("class Main {}");
    expect(h1).toBe(sha256Hex("class Main {}"));
    expect(h1).not.toBe(sha256Hex("class Main { }"));
  });
});
