# Adaptive microevents on current `main`

The source branch `feature/adaptive-microevents` branched before Wild Engine became the game's navigation authority. Merging it directly would import unrelated and obsolete simulation changes. This integration takes the microevent modules, atlas, translations, audio routing and directed tests onto the current `main`, then adapts the five integration seams: app lifecycle, renderer, harvest settlement, persistence and sound inventory. The original feature branch and its worktree remain untouched.

The optional event controller reads already visible crops and intact wooden walls from the current renderer. It renders a bounded instanced billboard batch in the world and owns a pointer gesture only after a hit on a visible particle. The simulation still owns crop income and applies the one reserved bird deduction at authoritative harvest. The controller uses separate RNG and never calls Wild Engine navigation. A campaign cinematic now cancels an active event at the transition instead of leaving it suspended behind the film.

While an event remains visible during a calm night, the app passes `nightFastForward: false` to the game clock. This temporarily changes the usual 5× night advancement to 1× so the player has time to interact; the normal rate returns immediately when the event disappears. The clock setting is transient and is not saved into game state. `tests/acceptance-clock.test.js` checks both transitions.

A later [real-browser integration probe](../night-clock-browser.md) also checks the app frame loop: night progression changes from about 5× to about 1× for visible fireflies, then returns to about 5× when the event is cancelled.

## Correction of obsolete visual fixtures

The prototype's saved QA farms used the former JavaScript terrain generator. Merely marking them as Wild Engine worlds would place buildings and crops according to the wrong physical terrain. `tools/prepare_microevent_fixture.mjs` and `tools/prepare_microevent_catalogue_fixtures.mjs` now construct paid farms with `createSpatialCampaignOpening`, the current native start site, current placement rules and the current world version. The checked-in fixtures were regenerated from these scripts.

## Directed results

- 84 directed microevent and SFX catalogue tests pass, including all 40 definitions' actual world projection and touch ownership. The harvest test uses the current Multiply power model: its crate is 416.52 coins in the controlled fixture, or 416 with the single reserved bird deduction. Delivery keeps the current game bonus and settles exactly once, including after reload.
- Normal production build, audio-runtime verification, source asset verification, browser syntax, web package, balance and plan checks pass.
- On a real Chrome/Intel UHD WebGL renderer, three current Wild Engine farms were loaded and their primary gestures completed: termites brushing by a wooden wall (0.99 s, 18 instances), firefly collection in Manglares at night (1.95 s, 36 instances), and rock brushing in Gran Cañón (1.02 s, 9 instances). All used their primary interaction, without the accessible hold fallback. The firefly and rock events played their assigned SFX through a running AudioContext; termites have no assigned cue. There were no browser exceptions or failed asset requests. See [results.json](results.json) and the three PNGs in this directory.
- A focused art pass refined termites, fireflies and falling debris without changing instance counts, interactions or atlas dimensions. The other 61 atlas cells remain pixel-identical. See [the before/after Chrome captures and QA](../visual-polish/README.md).

## Runtime scope

The [ABBA Chrome comparison](performance.json) uses the same frozen Wild Engine farm, camera, quality and 80 animation frames per arm, alternating Off/Event/Event/Off on Intel UHD. Event controller JavaScript CPU median was 0.4–0.5 ms and p95 0.8–1.1 ms while up to 14 instances were active. The observed frame medians were 33.6/49.9/49.8/49.8 ms, and p95 83.3/99.8/99.8/100.3 ms. The first Off run was faster than the other three, so this short browser comparison does **not** prove a frame-rate gain or a stable regression. It establishes that the active effect's own CPU preparation is bounded; the sample includes GPU drawing and unrelated world rendering but does not isolate GPU time. The frozen fixture is visual/performance QA, not a campaign benchmark.

Original branch QA, including all 40 interaction policies, remains documented in `docs/MICROEVENTS.md` and `docs/MICROEVENT-INTERACTIONS.md`. A physical phone interaction and subjective listening pass remain for device QA; neither is represented as automated evidence.

## Reproduce

```sh
node tools/prepare_microevent_fixture.mjs
node tools/prepare_microevent_catalogue_fixtures.mjs
node --test tests/microevents.test.js tests/microevent-harvest.test.js tests/microevent-billboards.test.js tests/microevent-feedback.test.js tests/microevent-interactions.test.js tests/sfx-catalog-audit.test.js
npm run dev -- --port 5221
# In a separate shell with WG_QA_PLAYWRIGHT_MODULE pointing to Playwright:
node tools/experiments/check-microevents-main-browser.mjs
node tools/experiments/benchmark-microevents-main-browser.mjs
```
