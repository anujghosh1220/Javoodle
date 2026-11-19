import { MISSIONS, type Mission } from "./catalogue";

/** Deterministic daily mission — same mission all day, changes at UTC midnight. */
export function dailyMissionFor(date: Date = new Date()): Mission {
  const key = date.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return MISSIONS[h % MISSIONS.length];
}

export function nextDailyMission(date: Date = new Date()): Mission {
  const tomorrow = new Date(date.getTime() + 86_400_000);
  return dailyMissionFor(tomorrow);
}

/** UTC date key for "today" — used for daily completion checks. */
export function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
