# Post-Jam usability polish — development evidence

Branch: `feature/post-jam-usability-polish`, isolated from balance campaigns.

Implemented candidates:

- Native Exit command uses Tauri `AppHandle.exit(0)`. The host coalesces clicks
  and awaits successful existing persistence before invoking it. Browser Exit
  retains the farewell screen without attempting to close a browser tab.
- Responsive presentation overrides for the four existing library labs; crop
  and destruction controls can collapse without recreating scene or lab state.
- Existing camera exclusion prototype extended to finite native wall/gate parts
  and contextual roof clearance before both orbital/terrain limits. Spatial
  neighborhoods are indexed and cached. User orbit intent remains independent
  from corrections. Production activation is a candidate on this branch only.

Acceptance is **pending**. Directed tests and a web build have passed, but they
do not prove complete visual, performance, streaming or packaged Windows QA.

`before/` retains the failed ANGLE GL screenshot backend attempt: corrupted
readback is not positive visual evidence. `before-default/` retains subsequent
valid Chromium screenshots; the capture sequence was interrupted when candidate
CSS was introduced, so do not treat its full directory as a frozen baseline.
`mobile-candidate-v1/` contains 16 direct-lab Chromium captures with no page
exceptions, and revealed a crop clock/speed overlap at 360×640. The following
candidate fixes it. These captures do not prove actual menu integration.

Integrated-menu QA, interactive controls, orientation/state preservation,
camera paths across cultures/biomes, reduced motion, performance comparison,
native Exit/restart and all required CI checks must finish before a PR.

Concurrent campaigns and regression tests are active in other worktrees. Any
timings collected under that load are functional diagnostics, not isolated
performance acceptance. No physical Android acceptance has been claimed.
