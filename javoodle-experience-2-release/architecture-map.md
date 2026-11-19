# Architecture Map

- `lib/experience/events.ts` — typed emitter (client). Events emitted ONLY from verified results: MissionWorkspace (execution/mission/xp), UnlockToast path, LevelUpOverlay.
- `components/experience/` — XPReactor, LevelUpOverlay, StreakFlame, AchievementConstellation, LearningGalaxy, ExperienceEffects.
- Mounted: ExperienceEffects in `(student)/layout.tsx`; XPReactor+StreakFlame+LevelUpOverlay in Dashboard; Constellation on /growth; Galaxy on /learn.
- Data: streak from xp_events (server); constellation from student_achievements join; galaxy from listLearnTopics; reactor from stats.xp + levelForXp.
- Reused: atmosphere engine (untouched), RobotCompanion events, xp_events ledger, achievement defs/evaluate, mission catalogue.
