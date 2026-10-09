# Full viewport library in the actual sanctuary

The reported screenshot matches the production bug: public/menu/native.js
replaced production-library content with sectionFrame, a70dvh iframe within the
scrolling menu panel. LibraryViewer already had a separate full-screen layout,
but the actual native sanctuary never invoked it. The old isolated browser
fixture therefore did not prove the real menu integration.

Native catalogue buttons now open a fixed body-level viewer outside panelstage.
The lab owns the remaining viewport beneath a small safe-area-aware header.
The original panel/catalogue remains mounted. Back releases the lab iframe,
restores each original inert state and returns focus to its catalogue button;
the sanctuary button uses the existing reverse travel without a reload.
Another lab releases the previous iframe, preventing simultaneous lab scenes.
The native menu tick skips rendering while this viewer is present. No new
renderer, RAF loop, lab assets or browser-fullscreen permission is required.

Both public runtime and src/ui/menu-integration.js contain the controller;
prepare_menu.py also preserves its render guard during regeneration. Relative
../library.html URLs retain itch nested-path compatibility.

Four lifecycle/production-entry tests pass, using the actual public controller:
body-level ownership, both source entry paths, generator guard, iframe disposal,
focus/inert restoration, repeated opens, invalid keys and Escape interception.
10/10 including fonts/resolution checks pass. Build, browser syntax, unchanged
126-SFX inventory and relative distribution checks pass; raw logs are archived.
These DOM-double/static checks do not prove WebGL appearance or mobile layout.

Browser QA first reached the actual sanctuary catalogue. A port5290 instance
was still serving a different worktree, so its old embedded lab was not used
as evidence for this fix. Root's own5392 instance reached the actual menu, but
the browser then timed out/reset and failed with a missing kernel asset path.
No new corrected-viewer screenshot was obtained. Visual acceptance of the real
built menu, portrait/landscape and all four labs remains explicitly pending.
Do not substitute the old isolated LibraryViewer screenshot for that evidence.

The source/hash receipt describes the combined library+routing working tree
build; it does not claim the original published itch build already contains
this fix. No deployment to itch was performed.
