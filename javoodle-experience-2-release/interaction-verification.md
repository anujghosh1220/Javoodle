# Interaction Verification

- Level-up: LIVE VERIFIED — localStorage hint=0 → overlay on reload → dismiss works.
- Mission submit events: code path verified (emits only post-server-response); live submit not re-run this pass (executor verified previously).
- XP awarded → reactor pulse + energy wave: event wiring verified in code; live award path previously E2E-verified (+40 XP mission).
- Achievement unlock toast: fires on dashboard when evaluateAndUnlock returns new defs — live path exercised in prior QA; constellation shows real unlock state.
- Visualizer: 7 examples stepped via chips; play/pause verified previously.
- Galaxy links navigate to /learn (href verified).
- Streak: real computed value rendered.
- Robot: emits celebrating on level-up/mission-complete, encouraging on failure — verified in code paths.
