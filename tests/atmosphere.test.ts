import { describe, expect, it } from "vitest";
import { resolveConfig } from "@/lib/atmosphere/presets";
import { DEFAULT_PREFS } from "@/lib/atmosphere/types";

const FULL = { ...DEFAULT_PREFS, matrixIntensity: 100, particleIntensity: 100 };
const cfg = (path: string, prefs = FULL, osReduced = false) =>
  resolveConfig(path, prefs, osReduced);

describe("atmosphere presets", () => {
  it("keeps exam take pages calm regardless of user mode", () => {
    for (const mode of ["auto", "matrix", "neural", "aurora", "minimal"] as const) {
      const c = cfg("/exams/abc123/take", { ...DEFAULT_PREFS, mode });
      expect(c.calm).toBe(true);
      expect(c.holograms).toBe(false);
      expect(c.cursorLight).toBe(false);
      expect(c.rain).toBeLessThan(0.1);
      expect(c.particles).toBeLessThan(0.1);
    }
  });

  it("forces everything off when effects are disabled", () => {
    const c = cfg("/dashboard", { ...DEFAULT_PREFS, effects: false });
    expect(c.off).toBe(true);
    expect(c.calm).toBe(true);
    expect(c.holograms).toBe(false);
    expect(c.cursorLight).toBe(false);
    expect(c.grid).toBe(0);
  });

  it("minimal mode suppresses canvas layers", () => {
    const c = cfg("/", { ...DEFAULT_PREFS, mode: "minimal" });
    expect(c.off).toBe(true);
    expect(c.cursorLight).toBe(false);
  });

  it("admin routes stay restrained", () => {
    const c = cfg("/admin/students");
    expect(c.rain).toBeLessThan(0.3);
    expect(c.particles).toBeLessThan(0.5);
    expect(c.holograms).toBe(false);
  });

  it("public landing gets the richest atmosphere", () => {
    const c = cfg("/");
    expect(c.rain).toBeGreaterThan(0.4);
    expect(c.particles).toBeGreaterThan(0.7);
    expect(c.holograms).toBe(true);
  });

  it("coding lab emphasizes grid over rain", () => {
    const c = cfg("/coding/abc");
    expect(c.grid).toBeGreaterThan(0.2);
    expect(c.holograms).toBe(false);
  });

  it("user intensity sliders scale canvas layers", () => {
    const low = cfg("/", { ...DEFAULT_PREFS, matrixIntensity: 0, particleIntensity: 0 });
    expect(low.rain).toBe(0);
    expect(low.particles).toBe(0);
  });

  it("OS reduced-motion disables motion", () => {
    const c = cfg("/dashboard", DEFAULT_PREFS, true);
    expect(c.off).toBe(true);
  });
});
