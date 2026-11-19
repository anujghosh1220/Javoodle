import { describe, expect, it } from "vitest";
import { dailyMissionFor, nextDailyMission } from "@/lib/missions/daily";
import { MISSIONS, getMission } from "@/lib/missions/catalogue";
import { MISSION_TESTS } from "@/lib/missions/tests.server";
import { evaluateAchievements, rankForLevel, ACHIEVEMENTS, RANKS } from "@/lib/achievements/defs";
import { clampStep, VIZ_EXAMPLES } from "@/lib/visualizer/engine";
import { PROJECTS } from "@/lib/projects/catalogue";
import { streakFromDates } from "@/lib/progression/streak";

describe("missions", () => {
  it("catalogue ids are unique uuids and every mission has hidden tests", () => {
    const ids = new Set(MISSIONS.map((m) => m.id));
    expect(ids.size).toBe(MISSIONS.length);
    for (const m of MISSIONS) expect(MISSION_TESTS[m.id]?.length).toBeGreaterThan(0);
  });
  it("daily mission is deterministic per date", () => {
    const d = new Date("2026-11-19T12:00:00Z");
    expect(dailyMissionFor(d).id).toBe(dailyMissionFor(d).id);
    expect(MISSIONS).toContain(dailyMissionFor(d));
    expect(nextDailyMission(d)).not.toBe(dailyMissionFor(d));
  });
  it("getMission resolves by id and slug", () => {
    expect(getMission(MISSIONS[0].id)?.slug).toBe(MISSIONS[0].slug);
    expect(getMission(MISSIONS[0].slug)?.id).toBe(MISSIONS[0].id);
  });
});

describe("achievements + ranks", () => {
  it("evaluateAchievements only returns qualified codes", () => {
    const none = evaluateAchievements({ xp: 0, lessonsCompleted: 0, missionsCompleted: 0, totalMissions: 10, codingRuns: 0, activeDays: 0, examsCompleted: 0, bestExamPercent: null });
    expect(none).toEqual([]);
    const some = evaluateAchievements({ xp: 600, lessonsCompleted: 1, missionsCompleted: 6, totalMissions: 10, codingRuns: 3, activeDays: 4, examsCompleted: 1, bestExamPercent: 85 });
    expect(some).toContain("first_lesson");
    expect(some).toContain("five_missions");
    expect(some).toContain("xp_500");
    expect(some).toContain("active_3");
    expect(some).toContain("exam_80");
    expect(some).not.toContain("all_missions");
  });
  it("rankForLevel maps levels to titles monotonically", () => {
    expect(rankForLevel(1).current.title).toBe("Code Rookie");
    expect(rankForLevel(5).current.title).toBe("Logic Warrior");
    expect(rankForLevel(99).current.title).toBe("Code Master");
    expect(RANKS.length).toBe(5);
    expect(ACHIEVEMENTS.every((a) => a.code && a.title)).toBe(true);
  });
});

describe("visualizer", () => {
  it("every example has steps ending in done", () => {
    for (const ex of VIZ_EXAMPLES) {
      expect(ex.steps.length).toBeGreaterThan(1);
      expect(ex.steps[ex.steps.length - 1].done).toBe(true);
    }
  });
  it("sort examples produce sorted output", () => {
    const bubble = VIZ_EXAMPLES.find((e) => e.id === "bubble")!;
    const sel = VIZ_EXAMPLES.find((e) => e.id === "selection")!;
    expect(bubble.steps.at(-1)!.output).toBe("1 2 5 8");
    expect(sel.steps.at(-1)!.cells?.every((c) => c.state === "sorted")).toBe(true);
  });
  it("clampStep bounds indices", () => {
    const steps = VIZ_EXAMPLES[0].steps;
    expect(clampStep(-5, steps)).toBe(0);
    expect(clampStep(999, steps)).toBe(steps.length - 1);
  });
});

describe("streak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    const now = new Date("2026-11-19T10:00:00Z");
    expect(streakFromDates(["2026-11-19", "2026-11-18", "2026-11-17"], now)).toBe(3);
    expect(streakFromDates(["2026-11-18", "2026-11-17"], now)).toBe(2); // yesterday-start still counts
    expect(streakFromDates(["2026-11-17", "2026-11-15"], now)).toBe(0); // gap + not today/yesterday
    expect(streakFromDates([], now)).toBe(0);
  });
});

describe("projects", () => {
  it("every milestone references a real mission slug", () => {
    const slugs = new Set(MISSIONS.map((m) => m.slug));
    for (const p of PROJECTS) for (const m of p.milestones) expect(slugs.has(m.missionSlug)).toBe(true);
  });
});
