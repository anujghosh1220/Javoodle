# Known Limitations
1. Execution Theatre: typed-character output reveal NOT implemented (perf rule: no per-char animation for large outputs) — styled console + status events only.
2. Level-up trigger relies on sessionStorage last-level hint — a student who never visits dashboard won't see it until next visit; never replays falsely.
3. Achievement "fresh" starburst approximates recency (last 3 unlocked) — cosmetic only.
4. Galaxy is a unit-level map (topics have phase); lesson-level star map would need richer data.
5. Robo moods reuse existing emotion set (no new Robot internals); mapping extended via events.
6. New visuals not screenshot-verified; performance not re-measured.
