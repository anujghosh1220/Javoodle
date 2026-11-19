# Accessibility — Final

- Constellation nodes have aria-labels ("{title} — unlocked/locked") + accessible detail panel (grid is not the only inspection path). PASS
- LevelUpOverlay: role=dialog aria-modal, Esc/click skip, focus not trapped. PASS
- XPReactor: role=img with full aria-label (level/XP/progress). PASS
- StreakFlame: title tooltip + text value (not color-only). PASS
- Reduced-motion: emulateMedia reduce → wave CSS disabled via media query; framer-motion components still render (opacity-only). PARTIAL — component-level reduced-motion variants not individually audited.
- Keyboard: all new interactive elements are buttons/links — tabbable. Focus indicators inherit global styles. PASS (spot-checked).
