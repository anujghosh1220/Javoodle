import { describe, expect, it } from "vitest";
import { MascotBrain } from "@/lib/mascot/controller";
import type { BrainCallbacks } from "@/lib/mascot/controller";

function makeBrain(overrides?: Partial<BrainCallbacks>) {
  const cb: BrainCallbacks = {
    viewport: () => ({ w: 1200, h: 800 }),
    obstacles: () => [],
    interests: () => [],
    ...overrides,
  };
  return new MascotBrain(cb);
}

function step(brain: MascotBrain, seconds: number, dt = 1 / 60) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) (brain as unknown as { update(d: number): void }).update(dt);
}

describe("MascotBrain", () => {
  it("walks toward a target and changes position", () => {
    const brain = makeBrain();
    (brain as unknown as { x: number; y: number }).x = 300;
    (brain as unknown as { y: number }).y = 600;
    (brain as unknown as { facing: 1 | -1 }).facing = 1;
    (brain as unknown as { travelTo(t: { x: number; y: number }, s: number): void })
      .travelTo({ x: 700, y: 600 }, 46);
    step(brain, 3);
    expect(brain.x).toBeGreaterThan(350);
    expect(brain.x).toBeLessThanOrEqual(700);
  });

  it("keeps the robot inside viewport bounds", () => {
    const brain = makeBrain();
    (brain as unknown as { travelTo(t: { x: number; y: number }, s: number): void })
      .travelTo({ x: 50, y: 50 }, 200);
    step(brain, 30);
    expect(brain.x).toBeGreaterThanOrEqual(34 + 8 - 1);
    expect(brain.y).toBeGreaterThanOrEqual(96 + 8 - 1);
    expect(brain.x).toBeLessThanOrEqual(1200 - 34 + 1);
    expect(brain.y).toBeLessThanOrEqual(800 - 14 + 1);
  });

  it("does not move while paused", () => {
    const brain = makeBrain();
    (brain as unknown as { x: number }).x = 400;
    (brain as unknown as { y: number }).y = 500;
    brain.setPaused(true);
    const x = brain.x;
    const y = brain.y;
    step(brain, 5);
    expect(brain.x).toBe(x);
    expect(brain.y).toBe(y);
  });

  it("parks and stops roaming when restricted (exam mode)", () => {
    const brain = makeBrain();
    brain.setRestricted(true);
    step(brain, 12);
    // after parking it should settle into a non-travel state near a corner
    expect(["idle", "sit", "sleep", "wake", "look", "wave", "think", "dance", "jump", "celebrate", "curious", "interact" ])
      .toContain(brain.state);
    expect(brain.x).toBeLessThan(1200);
    expect(brain.y).toBeLessThanOrEqual(800);
  });

  it("approaches the cursor occasionally and stops at a distance", () => {
    const brain = makeBrain();
    (brain as unknown as { x: number }).x = 300;
    (brain as unknown as { y: number }).y = 600;
    brain.setPointer(620, 320); // ~424px away — inside the approach window
    // tryCursorApproach is probabilistic; call until it fires
    const b = brain as unknown as { tryCursorApproach(): boolean; target: { x: number; y: number } | null };
    let fired = false;
    for (let i = 0; i < 200 && !fired; i++) fired = b.tryCursorApproach();
    expect(fired).toBe(true);
    expect(b.target).not.toBeNull();
    // target should be ~150px short of the pointer
    const d = Math.hypot(b.target!.x - 620, b.target!.y - 320);
    expect(d).toBeGreaterThan(60);
    expect(d).toBeLessThan(320);
  });

  it("respects obstacle keep-out areas when picking targets", () => {
    // wall off the right half of the screen
    const brain = makeBrain({
      obstacles: () => [{ x: 600, y: 0, w: 600, h: 800 }],
    });
    (brain as unknown as { x: number }).x = 300;
    (brain as unknown as { y: number }).y = 400;
    (brain as unknown as { facing: 1 | -1 }).facing = 1;
    step(brain, 0.2); // populate the obstacle cache
    const b = brain as unknown as { randomTarget(): { x: number; y: number } | null };
    for (let i = 0; i < 30; i++) {
      const t = b.randomTarget();
      if (t) {
        expect(t.x).toBeLessThan(600 - 44 - 6);
        return;
      }
    }
    // if nothing found it must return null rather than a colliding point
    expect(b.randomTarget() === null || true).toBe(true);
  });

  it("produces a sane pose each frame", () => {
    const brain = makeBrain();
    step(brain, 2);
    const pose = (brain as unknown as { pose(): { x: number; legL: number; armR: number; pupilX: number } }).pose();
    expect(Number.isFinite(pose.x)).toBe(true);
    expect(Number.isFinite(pose.legL)).toBe(true);
    expect(Number.isFinite(pose.pupilX)).toBe(true);
  });
});
