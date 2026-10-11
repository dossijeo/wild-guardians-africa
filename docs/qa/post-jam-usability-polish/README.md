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

## Latest functional evidence (11 October)

- `library-integrated-v6/`: actual main-menu integration, all four labs at
  1280×720, 844×390, 390×844 and 360×640; selection, demonstration, damage,
  rebuilding and SFX playback/volume controls pass with no page exceptions.
- `library-orientation-v5/`: English, genuine emulated taps, portrait →
  landscape → small portrait without resetting plants/material/damage/search.
  SFX entry pauses playing menu music; Escape restores playback and volume .72.
  Walls' initial and scrolled controls are captured independently. The narrow
  landscape sidebar no longer inherits the original four-column tool layout;
  camera controls fit in a compact two-column group.
- `camera-final-candidate-v7/`: native authored orbit/overflight/zoom routes,
  followed by actual mouse wheel/drag, across five cultures and six biomes,
  plus emulated portrait/landscape. JSON distinguishes geometric assertions
  from the screenshots and from physical-device/performance acceptance.
- `camera-dynamics-v2/`: Sabana and Gran Cañón, initial buried pose, large
  prop proximity, building rotation/damage, two streaming steps, emulated
  multitouch and orientation. No unresolved/terrain conflicts or exceptions.
- 132 focused regressions pass, including camera geometry/registry/controller,
  terrain, raid focus/travel and Library fullscreen. Twenty final camera and
  desktop exit unit checks pass. Build passes. Source/asset checks are recorded
  separately; none of these tests represents a physical Android run.

## Visual refinements and negative results

`camera-chrome-v4/` passed non-penetration assertions but close roof screenshots
still exposed excessively large faces. This was **not** accepted visually.
`camera-visual-margin-v5/` improved the finite volume buffer but did not fully
solve the framing. `camera-visual-framing-v6/` adds contextual zoom protection
only around the building at the point of interest, with a three-metre falloff
when moving away. The final candidate retains ordinary close viewing for crops,
NPCs and animals; large native trees have separate finite volumes. Existing
reversible prop fade handles open natural formations without closing archways
with artificial solid boxes. No new renderer, material or shader is created.

Large building margins derive from the authored world dimensions: horizontal
10% of footprint span clamped to 1.2–3 m, vertical 20% clamped to 2–6 m.
Walls/gate leaves retain their smaller 0.25/0.12 m margins. Contextual height
allows overflight rather than turning exclusion volumes into infinite columns.

The default headless shell took longer than the camera route timeout; Chrome's
installed channel completes the same route. Earlier failed backend/harness
reports remain available. A synthetic QA animal lacked its required exit point;
the fixture now supplies that metadata, without changing gameplay behavior.

## Native and performance gates

Windows run 38152758005 compiled, passed packaged smoke and native visibility,
then failed **before starting exit QA** due to a PowerShell interpolation typo.
`${stage}:` fixes the parsed script; rerun 38154700990 passed the genuine
packaged Exit/restart test on source b4e371c3. Raw create/restore reports have
ok=true, errors=[] and exitButtonFound=true; restore also has
restartRestored=true. The workflow waited for each actual process termination
and required ExitCode=0. create.committed and restore.previous preserve ledger,
plants, structures and villages exactly; balance is 665 coins. This is hosted
Windows packaged-app evidence, not a local physical Android test. Reports and
compressed full log are in `windows-38154700990/`.

The production Exit QA seeds a native paid crop/worker, loads it through the
real application, returns to the menu through the real persistence path, and
clicks the actual Exit button. A second packaged process verifies the committed
save. Writing a QA report never terminates the app. Only the production Tauri
Exit invocation can satisfy the process-exit gate.

`benchmark_camera_usability.mjs` measures the production CPU resolver against
the disabled path in ABBA order for 100/1,000/5,000 resident native tree
descriptors. It is intentionally labelled synthetic CPU-only. Windows CI runs
it on an isolated hosted runner and exports JSON; local campaign-contended
numbers remain diagnostic. Full render/frame-time comparison and physical
Android acceptance remain pending. Historical raw JSON is mirrored with the same
relative paths under `raw-reports/` as deterministic gzip files; representative
negative captures and current visual matrices remain uncompressed. No PR or
merge is approved by this document.
