# Nonempty crew required by the hiring panel

User requirement, 2026-10-07: the hiring/start button must not allow confirmation with zero selected workers.

Native markup starts disabled. Live refresh enables confirmation only when at least one worker is selected and the cost fits the balance; empty selections also cancel route preparation. The click handler independently rechecks that condition before taking prepared routes, charging, closing, saving, or starting audio. Shared policy applies to initial and additional hiring. Empty-contract simulation API behavior is retained for domain fixtures; the user-facing controller prevents those commands.

Spanish message: `Selecciona al menos un trabajador.` English: `Select at least one worker.` TSV catalog regenerated and catalog parity tests pass.

Browser fixture uses the actual native hiring markup, portraits, frame assets, styles and confirmation policy. Observed empty disabled → young man selected, cost 40 / balance 655, enabled → clear all, cost 0 / balance 695, disabled. Screenshot visually reviewed; tab closed. This isolated UI check does not prove a full gameplay/mobile/Tauri flow.

Directed tests: loader, confirmation, additional hiring, payroll audio (11/11); i18n and confirmation (14/14, two overlap). Production build passes, retaining the existing large-bundle warning. No itch.io deployment.
