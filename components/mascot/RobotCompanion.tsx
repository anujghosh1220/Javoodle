"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Robot, type RobotMood } from "./Robot";
import { MascotBrain } from "@/lib/mascot/controller";
import type { AnimState, InterestPoint, PoseFrame } from "@/lib/mascot/types";
import { onRobotEvent, type RobotEmotion } from "@/lib/mascot/events";
import type { CompanionMemory } from "@/lib/mascot/memory";

const ROUTE_MOOD: Array<[RegExp, RobotMood, string]> = [
  [/^\/exams\/[^/]+\/take/, "focused", "Let's focus — you've got this!"],
  [/^\/exams\/[^/]+\/result/, "celebrating", "Results are in — nice work!"],
  [/^\/exams/, "happy", "Let's see what you've learned!"],
  [/^\/coding\/[^/]+/, "focused", "Time to write some Java!"],
  [/^\/coding/, "happy", "Ready to solve a challenge?"],
  [/^\/learn/, "thinking", "Let's learn something new."],
  [/^\/practice/, "excited", "Ready for a challenge?"],
  [/^\/growth/, "happy", "Look how far you've come!"],
  [/^\/dashboard/, "happy", "Ready for another adventure?"],
];

const EXAM_TAKE = /^\/exams\/[^/]+\/take/;

const REACTIONS: Record<RobotEmotion, { mood: RobotMood; text: string; ms: number }> = {
  happy: { mood: "happy", text: "Nice work!", ms: 3500 },
  excited: { mood: "excited", text: "That was awesome!", ms: 4000 },
  thinking: { mood: "thinking", text: "Hmm, let me think…", ms: 3000 },
  confused: { mood: "confused", text: "Hmm, tricky one!", ms: 3000 },
  encouraging: { mood: "sad", text: "Almost! Try again — you've got this.", ms: 4000 },
  celebrating: { mood: "celebrating", text: "Amazing! 🎉", ms: 5000 },
  focused: { mood: "focused", text: "Let's focus.", ms: 2500 },
  sleepy: { mood: "sleepy", text: "*yawn*…", ms: 3000 },
  idle: { mood: "idle", text: "", ms: 0 },
};

const IDLE_LINES = [
  "Need a hint?",
  "You're getting better!",
  "One line at a time!",
  "Let's do this!",
  "Let's explore!",
  "Where should we go?",
  "Oh, what's this?",
  "Ready for another challenge?",
  "I found something interesting!",
  "Let's get back to work!",
  "That was awesome!",
  "I need a little rest…",
];

const BEHAVIOR_LINES: Partial<Record<AnimState, string[]>> = {
  curious: ["Oh, what's this?", "I found something interesting!"],
  interact: ["Hello!", "Look at me!"],
  dance: ["Let's dance!", "Feel the rhythm!"],
  sit: ["I need a little rest…", "Five more minutes…"],
  sleep: ["*yawn*…", "So cozy…"],
  wave: ["Hi!", "Hey there!"],
  think: ["Hmm, let me think…"],
};

const OBSTACLE_SELECTOR = [
  // interactive elements
  'button', 'a[href]', 'input', 'textarea', 'select', '[role="button"]',
  '[contenteditable="true"]', 'nav', 'header',
  // content regions — cards, sections, panels, forms
  'main section', 'main article', 'main header', 'main footer',
  'main .rounded-card', 'main [data-keep-clear]', 'form',
  // editor + overlays
  '.monaco-editor', '[role="dialog"]', '[role="menu"]', '[role="listbox"]',
  '[data-radix-popper-content-wrapper]', '[data-keep-clear]',
].join(", ");
const INTEREST_SELECTOR = 'main nav a[href], main a[href], [data-robot-interest]';

type SvgParts = Partial<Record<string, SVGGElement | null>>;

const PREFS_KEY = "javoodle.companion.prefs";

interface Prefs {
  roam: boolean;
  hidden: boolean;
}

function personalize(msg: string, m: CompanionMemory): string {
  if (m.lastCoding && /coding|Java|challenge/i.test(msg)) return `Back to Java, ${m.name}? Let's build something awesome!`;
  if (m.lastExam && /exams|learned/i.test(msg)) return `${m.name}, ready to see what you've learned?`;
  if (m.hasActivity && /adventure/i.test(msg)) return `Welcome back, ${m.name} — ready for another adventure?`;
  if (!m.hasActivity && /adventure/i.test(msg)) return `Hey ${m.name}! I'm your Javoodle companion — ready to start?`;
  return msg;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { roam: true, hidden: false, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { roam: true, hidden: false };
}

export function RobotCompanion({ memory }: { memory?: CompanionMemory }) {
  const pathname = usePathname();
  const [mood, setMood] = useState<RobotMood>("happy");
  const [bubble, setBubble] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ roam: true, hidden: false });
  const [reducedMotion, setReducedMotion] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useRef(false);
  const streak = useRef(0);
  const compFails = useRef(0);
  const lastInteract = useRef(0);
  const lastRoamLine = useRef(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const robotBoxRef = useRef<HTMLDivElement>(null);
  const bubblePosRef = useRef<HTMLDivElement>(null);
  const bubbleTailRef = useRef<HTMLSpanElement>(null);
  const bubbleSize = useRef({ w: 184, h: 56 });
  const robotH = useRef(128);
  const quietRef = useRef(false);
  const bubbleLayout = useRef("");
  const partsRef = useRef<SvgParts>({});
  const pupilsRef = useRef<SVGGElement[]>([]);
  const brainRef = useRef<MascotBrain | null>(null);

  const showBubble = useCallback((text: string, ms = 4000) => {
    setBubble(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBubble(null), ms);
  }, []);

  // ---- boot: prefs, reduced-motion, brain --------------------------------
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced.current);
    lastInteract.current = Date.now();
    setPrefs(loadPrefs());

    const brain = new MascotBrain({
      viewport: () => ({ w: window.innerWidth, h: window.innerHeight }),
      obstacles: () => {
        const out: { x: number; y: number; w: number; h: number }[] = [];
        const els = document.querySelectorAll<HTMLElement>(OBSTACLE_SELECTOR);
        for (const el of Array.from(els)) {
          if (el.closest("[data-companion]") || el.closest("[data-companion-controls]")) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) continue;
          if (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") continue;
          out.push({ x: r.left, y: r.top, w: r.width, h: r.height });
          if (out.length > 160) break;
        }
        return out;
      },
      interests: () => {
        const out: InterestPoint[] = [];
        const els = document.querySelectorAll<HTMLElement>(INTEREST_SELECTOR);
        for (const el of Array.from(els)) {
          const r = el.getBoundingClientRect();
          if (r.width < 24 || r.height < 12) continue;
          if (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) continue;
          out.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          if (out.length > 40) break;
        }
        return out;
      },
      onBehavior: (state: AnimState) => {
        const lines = BEHAVIOR_LINES[state];
        if (!lines || reduced.current || document.hidden || quietRef.current) return;
        if (Date.now() - lastRoamLine.current < 45000) return;
        lastRoamLine.current = Date.now();
        showBubble(lines[Math.floor(Math.random() * lines.length)], 3500);
      },
    });
    brainRef.current = brain;
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __robotBrain?: MascotBrain }).__robotBrain = brain;
    }

    // Position the speech bubble: above the head when there's room,
    // below the feet otherwise, always clamped inside the viewport.
    const layoutBubble = (p: PoseFrame) => {
      const bp = bubblePosRef.current;
      if (!bp) return;
      const W = bubbleSize.current.w;
      const H = bubbleSize.current.h;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 14;
      const bx = Math.max(10, Math.min(p.x - W / 2, vw - W - 10));
      const relX = bx - p.x;
      let by = -(robotH.current * 0.9 + gap + H);
      let side: "above" | "below" | "hidden" = "above";
      if (p.y + by < 10) {
        by = 12;
        if (p.y + by + H > vh - 8) { side = "hidden"; }
        else side = "below";
      }
      const tail = bubbleTailRef.current;
      const tailX = Math.max(14, Math.min(p.x - bx - 6, W - 26));
      const key = `${relX}|${by}|${side}|${tailX}`;
      if (key === bubbleLayout.current) return;
      bubbleLayout.current = key;
      bp.style.transform = `translate(${relX}px, ${by}px)`;
      bp.style.visibility = side === "hidden" ? "hidden" : "visible";
      bp.dataset.side = side === "hidden" ? "above" : side;
      if (tail) {
        tail.style.left = `${tailX}px`;
        tail.style.top = side === "below" ? "-5px" : "";
        tail.style.bottom = side === "above" ? "-5px" : "";
        tail.style.transform = side === "below" ? "translateX(-50%) rotate(225deg)" : "translateX(-50%) rotate(45deg)";
      }
    };

    const apply = (p: PoseFrame) => {
      const wrap = wrapRef.current;
      if (wrap) wrap.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      const flip = flipRef.current;
      // viewBox has ~8% transparent padding below the feet — compensate so the
      // feet (not the svg bottom edge) sit on the ground line
      const pad = robotH.current * 0.08;
      if (flip) flip.style.transform = `translate(-50%, -100%) translate(0 ${pad}px) scaleX(${p.facing * p.sx})`;
      const parts = partsRef.current;
      if (parts.root)
        parts.root.setAttribute(
          "transform",
          `translate(0 ${p.rootY}) translate(50 166) rotate(${p.rootRot} 50 166) scale(1 ${p.breath}) translate(-50 -166)`
        );
      if (parts.body) parts.body.setAttribute("transform", `translate(0 ${p.bodyY})`);
      if (parts.legL) parts.legL.setAttribute("transform", `translate(0 ${p.legLiftL}) rotate(${p.legL})`);
      if (parts.legR) parts.legR.setAttribute("transform", `translate(0 ${p.legLiftR}) rotate(${p.legR})`);
      if (parts.armL) parts.armL.setAttribute("transform", `rotate(${p.armL})`);
      if (parts.armR) parts.armR.setAttribute("transform", `rotate(${p.armR})`);
      if (parts.head)
        parts.head.setAttribute("transform", `translate(${p.headDX} ${p.headDY}) rotate(${p.headRot} 50 50)`);
      if (parts.zzz) parts.zzz.setAttribute("opacity", p.zzz.toFixed(3));
      for (const pu of pupilsRef.current) pu.setAttribute("transform", `translate(${p.pupilX} ${p.pupilY})`);
      layoutBubble(p);
    };

    brain.start(apply);

    const onMove = (e: PointerEvent) => brain.setPointer(e.clientX, e.clientY);
    window.addEventListener("pointermove", onMove, { passive: true });

    // pause roaming while the user is selecting text or editing
    const onSelect = () => {
      const sel = window.getSelection();
      brain.setDistracted(!!sel && !sel.isCollapsed);
    };
    document.addEventListener("selectionchange", onSelect);
    const focusTimer = setInterval(() => {
      const el = document.activeElement as HTMLElement | null;
      const editing =
        !!el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" ||
          el.isContentEditable || el.closest(".monaco-editor") !== null);
      brain.setDistracted(editing);
    }, 400);

    return () => {
      brain.stop();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("selectionchange", onSelect);
      clearInterval(focusTimer);
      brainRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture animatable SVG parts + pupils (pupils are re-created on mood change)
  useEffect(() => {
    const svg = robotBoxRef.current?.querySelector("svg");
    if (!svg) return;
    for (const el of Array.from(svg.querySelectorAll<SVGGElement>("[data-part]"))) {
      const name = el.getAttribute("data-part");
      if (name) partsRef.current[name] = el;
    }
    pupilsRef.current = Array.from(svg.querySelectorAll<SVGGElement>("[data-pupil]"));
  }, [mood, prefs.hidden, reducedMotion]);

  // Track rendered robot size for bubble placement + collision footprint
  useEffect(() => {
    const measure = () => {
      const box = robotBoxRef.current;
      const h = box?.offsetHeight;
      const w = box?.offsetWidth;
      if (h) robotH.current = h;
      if (w && h) {
        // visual character ≈ 89% of svg height, centered horizontally with
        // ~13% transparent padding each side; add margin for limb extension
        brainRef.current?.setFootprint(Math.min(w * 0.52, 62), h * 0.9 + 10);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [prefs.hidden, reducedMotion]);

  // Measure bubble size whenever it appears
  useEffect(() => {
    if (!bubble) return;
    const id = setTimeout(() => {
      const el = bubblePosRef.current?.firstElementChild as HTMLElement | null;
      if (el) bubbleSize.current = { w: el.offsetWidth, h: el.offsetHeight };
      bubbleLayout.current = "";
    }, 60);
    return () => clearTimeout(id);
  }, [bubble]);

  // reduced-motion can change while the app is open
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => {
      reduced.current = mq.matches;
      setReducedMotion(mq.matches);
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // ---- prefs --------------------------------------------------------------
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
    const brain = brainRef.current;
    if (!brain) return;
    brain.setPaused(!prefs.roam || reducedMotion || prefs.hidden);
  }, [prefs, reducedMotion]);

  // ---- mood -> brain ------------------------------------------------------
  useEffect(() => {
    brainRef.current?.setMood(mood);
  }, [mood]);

  const routeDefault = useCallback(() => {
    for (const [re, m, msg] of ROUTE_MOOD) {
      if (re.test(pathname)) return { mood: m, msg };
    }
    return { mood: "idle" as RobotMood, msg: "Hey there!" };
  }, [pathname]);

  // Route-aware greeting + travel behaviour (once per navigation)
  useEffect(() => {
    const brain = brainRef.current;
    const quiet = EXAM_TAKE.test(pathname);
    quietRef.current = quiet;
    brain?.setRestricted(quiet);
    const t = setTimeout(() => {
      const { mood: m, msg } = routeDefault();
      setMood(m);
      if (!reduced.current && bubble === null) {
        showBubble(memory ? personalize(msg, memory) : msg, 5000);
      }
      // travelling personality hints
      if (brain && !reduced.current) {
        if (/^\/coding/.test(pathname)) brain.react("thinking");
        else if (/^\/practice/.test(pathname)) brain.react("excited");
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Returning after being away -> friendly greeting
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden && Date.now() - lastInteract.current > 120000 && !reduced.current && !quietRef.current) {
        lastInteract.current = Date.now();
        setMood("happy");
        showBubble("Welcome back! Ready to continue?", 4500);
        setTimeout(() => setMood(routeDefault().mood), 4600);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // App events (coding run success/error, exam submit, etc.)
  useEffect(() => onRobotEvent((emotion) => {
    if (emotion === "happy" || emotion === "excited") streak.current += 1;
    else if (emotion === "encouraging") streak.current = 0;
    if (emotion === "encouraging") compFails.current += 1; else compFails.current = 0;
    lastInteract.current = Date.now();
    brainRef.current?.react(emotion);

    let eff = emotion;
    let textOverride: string | null = null;
    if (streak.current >= 3 && emotion === "happy") { eff = "celebrating"; textOverride = "Three in a row — on fire! 🔥"; streak.current = 0; }
    if (compFails.current >= 2 && emotion === "encouraging") { textOverride = "Stubborn error? Read the message carefully — you're close!"; }
    const r = REACTIONS[eff];
    if (!r) return;
    setMood(r.mood);
    if (!reduced.current) {
      showBubble(textOverride ?? r.text, r.ms);
      setTimeout(() => {
        setBubble((b) => (b === (textOverride ?? r.text) ? null : b));
        setMood(routeDefault().mood);
      }, r.ms);
    } else {
      setMood(routeDefault().mood);
    }
  }), [pathname, routeDefault, showBubble]);

  // Occasional idle chatter
  useEffect(() => {
    const id = setInterval(() => {
      if (reduced.current || document.hidden || bubble || quietRef.current) return;
      showBubble(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)], 4000);
    }, 75000);
    return () => clearInterval(id);
  }, [bubble, showBubble]);

  const poke = () => {
    lastInteract.current = Date.now();
    brainRef.current?.poke();
    const r = REACTIONS[["excited", "happy", "thinking"][Math.floor(Math.random() * 3)] as RobotEmotion];
    setMood(r.mood);
    showBubble(r.text, r.ms);
    setTimeout(() => setMood(routeDefault().mood), r.ms);
  };

  const setPref = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));

  const bubbleEl = (
    <div ref={bubblePosRef} data-side="above" className="pointer-events-none absolute left-0 top-0 z-20">
      <AnimatePresence>
        {bubble && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="w-max max-w-44 rounded-2xl border border-cream-300/60 bg-cream-100/95 px-3 py-2 text-xs font-bold text-ink-700 shadow-lg backdrop-blur-sm"
          >
            {bubble}
            <span
              ref={bubbleTailRef}
              className="absolute h-2.5 w-2.5 rounded-[3px] bg-cream-100"
              style={{ left: 0, bottom: -5, transform: "translateX(-50%) rotate(45deg)" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const bubbleElStatic = bubble ? (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="pointer-events-none mb-2 max-w-44 rounded-2xl rounded-br-sm border border-cream-300/60 bg-cream-100/95 px-3 py-2 text-xs font-bold text-ink-700 shadow-lg backdrop-blur-sm"
    >
      {bubble}
    </motion.div>
  ) : null;

  const controls = (
    <div data-companion-controls className="pointer-events-auto flex items-center gap-1 rounded-full border border-cream-300/50 bg-cream-200/90 p-1 shadow-lg backdrop-blur-sm">
      {!reducedMotion && (
        <button
          onClick={() => setPref({ roam: !prefs.roam })}
          aria-label={prefs.roam ? "Pause companion roaming" : "Resume companion roaming"}
          title={prefs.roam ? "Pause roaming" : "Resume roaming"}
          className="flex h-6 w-6 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-cream-300/60 hover:text-lav-300"
        >
          {prefs.roam ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
      )}
      <button
        onClick={() => setPref({ hidden: !prefs.hidden })}
        aria-label={prefs.hidden ? "Show Javoodle companion" : "Hide companion"}
        title={prefs.hidden ? "Show companion" : "Hide companion"}
        className="flex h-6 w-6 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-cream-300/60 hover:text-lav-300"
      >
        {prefs.hidden ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
      </button>
    </div>
  );

  // Reduced motion: stationary companion, bottom-right (original placement)
  if (reducedMotion) {
    if (prefs.hidden) {
      return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          {controls}
        </div>
      );
    }
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        <AnimatePresence>{bubbleElStatic}</AnimatePresence>
        <div className="pointer-events-auto relative">
          <button
            onClick={poke}
            aria-label="Javoodle companion — click to say hi"
            className="block cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            <Robot mood={mood} size={104} className="h-24 w-auto sm:h-32" trackCursor />
          </button>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lav-400/90 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
            {memory?.level ?? "Companion"}
          </span>
        </div>
        <div className="pointer-events-auto self-start">{controls}</div>
      </div>
    );
  }

  if (prefs.hidden) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
        <span className="rounded-full border border-cream-300/50 bg-cream-200/90 px-2 py-1 text-[10px] font-bold text-ink-400 shadow-lg backdrop-blur-sm">
          Companion hidden
        </span>
        {controls}
      </div>
    );
  }

  return (
    <>
      {/* roaming companion — position driven by MascotBrain via transform */}
      <div ref={wrapRef} data-companion className="pointer-events-none fixed left-0 top-0 z-40 will-change-transform overflow-visible">
        {bubbleEl}
        <div ref={flipRef} className="relative overflow-visible" style={{ transform: "translate(-50%, -100%)" }}>
          <div ref={robotBoxRef} className="overflow-visible">
            <button
              onClick={poke}
              aria-label="Javoodle companion — click to say hi"
              className="pointer-events-auto block cursor-pointer"
            >
              <Robot mood={mood} size={128} className="h-28 w-auto sm:h-36" animated={false} />
            </button>
          </div>
        </div>
      </div>
      {/* controls dock */}
      <div data-companion-controls className="fixed bottom-3 left-3 z-50 flex items-center gap-2">
        <span className="hidden rounded-full border border-cream-300/40 bg-cream-200/80 px-2 py-1 text-[10px] font-bold text-ink-400/80 shadow-md backdrop-blur-sm sm:block">
          {memory?.level ?? "Companion"}
        </span>
        {controls}
      </div>
    </>
  );
}


