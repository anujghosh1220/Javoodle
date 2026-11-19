"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AtmosphereEngine } from "@/lib/atmosphere/engine";
import { loadPrefs, resolveConfig, savePrefs } from "@/lib/atmosphere/presets";
import { DEFAULT_PREFS, type AtmosphereConfig, type AtmospherePrefs } from "@/lib/atmosphere/types";
import { AtmosphereOverlay } from "./AtmosphereOverlay";

interface AtmosphereContextValue {
  prefs: AtmospherePrefs;
  updatePrefs: (patch: Partial<AtmospherePrefs>) => void;
  config: AtmosphereConfig;
  examMode: boolean;
}

const Ctx = createContext<AtmosphereContextValue | null>(null);

export function useAtmosphere(): AtmosphereContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAtmosphere must be used inside AtmosphereProvider");
  return v;
}

const EXAM_TAKE = /^\/exams\/[^/]+\/take/;

/**
 * Root atmosphere system. Mounted once in the root layout; resolves the
 * per-route preset, owns user preferences, and coordinates the shared
 * canvas engine + DOM layers for the whole app.
 */
export function AtmosphereProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const examMode = EXAM_TAKE.test(pathname);

  const [prefs, setPrefs] = useState<AtmospherePrefs>(DEFAULT_PREFS);
  const [osReduced, setOsReduced] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [engine, setEngine] = useState<AtmosphereEngine | null>(null);

  // Boot: load saved prefs + OS reduced-motion (async to satisfy lint).
  // `hydrated` gates persistence so the default state is never written
  // back over stored prefs (StrictMode double-effects, slow rAF, etc.).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setPrefs(loadPrefs());
      setOsReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setHydrated(true);
    });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e: MediaQueryListEvent) => setOsReduced(e.matches);
    mq.addEventListener("change", on);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", on);
    };
  }, []);

  // Persist on change — only after stored prefs have been loaded, so the
  // initial DEFAULT_PREFS render never overwrites the user's saved choices.
  useEffect(() => {
    if (!hydrated) return;
    savePrefs(prefs);
  }, [prefs, hydrated]);

  const config = useMemo(
    () => resolveConfig(pathname, prefs, osReduced),
    [pathname, prefs, osReduced]
  );

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Canvas engine lifecycle — created once, config read live each frame.
  useEffect(() => {
    const canvas = document.getElementById("javoodle-atmosphere") as HTMLCanvasElement | null;
    if (!canvas) return;
    const eng = new AtmosphereEngine(canvas, () => configRef.current);
    setEngine(eng);
    eng.apply();
    return () => {
      eng.destroy();
      setEngine(null);
    };
  }, []);

  // Push config changes into the engine (reseed when intensities change).
  useEffect(() => {
    engine?.reseed();
  }, [engine, config]);

  const updatePrefs = useCallback(
    (patch: Partial<AtmospherePrefs>) => setPrefs((p) => ({ ...p, ...patch })),
    []
  );

  const value = useMemo(
    () => ({ prefs, updatePrefs, config, examMode }),
    [prefs, updatePrefs, config, examMode]
  );

  return (
    <Ctx.Provider value={value}>
      <canvas
        id="javoodle-atmosphere"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      />
      <AtmosphereOverlay />
      {children}
    </Ctx.Provider>
  );
}
