# Nonempty crew required by the hiring panel

User requirement, 2026-10-07: the hiring/start button must not allow confirmation with zero selected workers.

Native markup starts disabled. Live refresh enables confirmation only when at least one worker is selected and the cost fits the balance; empty selections also cancel route preparation. The click handler independently rechecks that condition before taking prepared routes, charging, closing, saving, or starting audio. Shared policy applies to initial and additional hiring. Empty-contract simulation API behavior is retained for domain fixtures; the user-facing controller prevents those commands.

Spanish message: `Selecciona al menos un trabajador.` English: `Select at least one worker.` TSV catalog regenerated and catalog parity tests pass.

Browser fixture uses the actual native hiring markup, portraits, frame assets, styles and confirmation policy. Observed empty disabled → young man selected, cost 40 / balance 655, enabled → clear all, cost 0 / balance 695, disabled. Screenshot visually reviewed; tab closed. This isolated UI check does not prove a full gameplay/mobile/Tauri flow.

Directed tests: loader, confirmation, additional hiring, payroll audio (11/11); i18n and confirmation (14/14, two overlap). Production build passes, retaining the existing large-bundle warning. No itch.io deployment.

## Actual game follow-up

On main `448c196a`, ordinary new-game UI at localhost:5181, Sabana / Mapungubwe, 1280×720. No saved-state or gameplay overrides; generated seed not recorded. Placed a centre (1500 → 700), planted millet (700 → 695), advanced the guardian explanation and observed automatic mandatory hiring at 08:06. Empty selection was disabled. Adding one older woman enabled confirmation, quoting 30 and a remaining balance of 665. Clearing restored disabled / cost 0 / balance 695 without closing the panel. Selecting her again and confirming closed hiring and changed the actual HUD balance once to 665; the clock advanced to 08:07 in the saved screenshot. Both screenshots were visually inspected.

The temporary game tab was closed. No browser-console/GL capture, physical-mobile, complete worker route, first raid or cache-network claim. The impostor agent ran a separate functional scene concurrently, so this is not a performance sample. Post-build package check passed: 641 files / 377,430,730 bytes, 859 relative links and 20 runtime GLBs without original duplicates. CI was still running tests when checked, not terminal green.
