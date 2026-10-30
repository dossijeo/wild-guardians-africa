# Attack cooldown integration repair

Inspection found that Game.tick reset every cooldown except Shield to zero. Attack assigned 12 seconds on casting, but the next simulation step discarded it. The spell-card status also handled only Shield. Both now retain Attack alongside Shield; agricultural spells remain without cooldown.

Validation: node --test tests/guardian-combat.test.js tests/spell-cards.test.js passes all 18 tests. The new integration regression casts Attack, advances the real Game.tick, rejects an immediate repeat, round-trips the remaining cooldown through snapshots, freezes it during a menu pause, advances to the last tenth of a second, rejects an early repeat, and permits a new cast at zero. Card status checks countdown, percentage, disabled state and recovery.

This is simulation and UI-function evidence, not a graphical menu acceptance test. Existing controlled combat recordings that explicitly clear cooldowns do not prove normal gameplay cooldown behavior. Earlier repeated-attack performance recordings predate this repair and must not be taken as measurements of the corrected cadence without rerunning them. Full objective remains active.

## Browser validation

Ran tests/browser/attack-cooldown.html through visible controls using the original spell-card markup, SVG icons, CSS and refresh function with real Game.cast/Game.tick. Attack becomes disabled and displays 11 after one simulated second. Pausing and stepping preserves 11; resuming and advancing eleven seconds restores the enabled card and removes its countdown. A second click succeeds, giving casts=2, cooldown=12, error=null (attack-cooldown-browser.json). Screenshot shows the disabled countdown. This focused DOM integration uses a prepared night and navigation stub; it does not certify the full main-menu selection/raycast flow or graphical combat.

SaveRepository regression now verifies two consecutive save/load cycles, advancing the loaded game, rejecting Attack during the remaining cooldown and reaching zero after the remaining simulation time. All 19 focused combat/card tests pass on final files. Restored original UTF-8 Spanish text in the two test files after detecting accidental encoding conversion during the previous edit; runtime source text is preserved.
