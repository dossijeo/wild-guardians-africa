# Post-Jam usability polish â€” development evidence

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

Final functional, visual, isolated CPU and packaged Windows acceptance is complete.
Validate 38163747763 passes 3992 tests, zero failures and one skip, build, asset/audio
verification and itch.io packaging; Windows 38160568081 passes the real packaged
Exit and persisted restart. Productive sources remain 49242c78. Integration travels
through the feature PR and its own checks. Physical Android was not executed.
The candidate/pending notes below are preserved development history.

`before/` retains the failed ANGLE GL screenshot backend attempt: corrupted
readback is not positive visual evidence. `before-default/` retains subsequent
valid Chromium screenshots; the capture sequence was interrupted when candidate
CSS was introduced, so do not treat its full directory as a frozen baseline.
`mobile-candidate-v1/` contains 16 direct-lab Chromium captures with no page
exceptions, and revealed a crop clock/speed overlap at 360Ã—640. The following
candidate fixes it. These captures do not prove actual menu integration.

Integrated-menu QA, interactive controls, orientation/state preservation,
camera paths across cultures/biomes, reduced motion, performance comparison,
native Exit/restart and all required CI checks must finish before a PR.

Concurrent campaigns and regression tests are active in other worktrees. Any
timings collected under that load are functional diagnostics, not isolated
performance acceptance. No physical Android acceptance has been claimed.

## Latest functional evidence (11 October)

- `library-integrated-v6/`: actual main-menu integration, all four labs at
  1280Ã—720, 844Ã—390, 390Ã—844 and 360Ã—640; selection, demonstration, damage,
  rebuilding and SFX playback/volume controls pass with no page exceptions.
- `library-orientation-v5/`: English, genuine emulated taps, portrait â†’
  landscape â†’ small portrait without resetting plants/material/damage/search.
  SFX entry pauses playing menu music; Escape restores playback and volume .72.
  Walls' initial and scrolled controls are captured independently. The narrow
  landscape sidebar no longer inherits the original four-column tool layout;
  camera controls fit in a compact two-column group.
- `camera-final-candidate-v7/`: native authored orbit/overflight/zoom routes,
  followed by actual mouse wheel/drag, across five cultures and six biomes,
  plus emulated portrait/landscape. JSON distinguishes geometric assertions
  from the screenshots and from physical-device/performance acceptance.
- `camera-dynamics-v2/`: Sabana and Gran CaÃ±Ã³n, initial buried pose, large
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
10% of footprint span clamped to 1.2â€“3 m, vertical 20% clamped to 2â€“6 m.
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
numbers remain diagnostic. The real-render comparison is recorded below. Physical Android is not claimed;
it is an explicitly unexecuted coverage limit rather than an approval gate. Historical raw JSON is mirrored with the same
relative paths under `raw-reports/` as deterministic gzip files; representative
negative captures and current visual matrices remain uncompressed. No PR or
merge is approved by this document.


## Final interaction and rendering diagnostics

`library-language-toggle-v8/` repeats genuine touch and orientation testing
and additionally changes ES â†’ EN while every lab is open. Plants, material,
damage and sound search survive both language changes and viewport changes.
All four reports have empty exception lists; SFX restores the previous playing
menu music at volume .72.

`camera-render-cost-diagnostic/` uses the actual render pipeline in ABBA order,
with protection off/on/on/off, identical camera and target, unchanged simulation,
30 warm-up frames and 180 measured frames per arm. Every arm submits exactly
one render per frame, 55 draw calls, identical triangles, 104 geometries,
68 textures and 45 shader programs. Protection adds no rendering resources or
passes in this frozen scene. GPU timer samples are valid in all arms.

| Arm | CPU submission mean ms | GPU mean ms | GPU p95 ms |
|---|---:|---:|---:|
| A1 off | 10.251 | 30.718 | 49.661 |
| B1 on | 9.838 | 29.686 | 48.492 |
| B2 on | 9.803 | 28.044 | 42.903 |
| A2 off | 9.813 | 31.040 | 49.168 |

Chrome 154 / ANGLE D3D11 / Intel UHD. These timings were collected with the
balance campaign active and remain diagnostic: neither the lower B means nor
the frame-time variation establishes a causal GPU/FPS improvement. The renderer
invariants are exact assertions. The separate hosted Windows CPU benchmark is
the isolated cost gate for the added resolver. Its static distant-tree fixture
checks cached queries without scanning all resident descriptors; it does not
represent crowded nearby obstacles, GPU rendering or physical mobile hardware.

An isolated read-only Android emulator was attempted on port 5574. It booted
Android 8.0; automatic approval rejected launching/debugging Chrome with
`blocked by policy`. No alternative launch bypass was attempted. Android
Chrome composition was therefore not executed, and no physical Pixel acceptance
is claimed. Only that owned emulator was shut down; the unrelated existing
emulator and campaign processes were preserved. Browser-emulated touch, safe
layouts, orientation, runtime translation and Windows packaged execution remain
separate evidence categories.


The `camera-dynamics-v2/` portrait screenshots were found blank during final
human review: the isolated fixture does not run continuously, and viewport resize
cleared its framebuffer. Those screenshots are negative visual evidence despite
the geometric reports passing. The corrected v3 harness explicitly renders and
waits for a fresh report after resizing; the two replacement captures show the
actual scene. The production render loop was not changed for this correction.

The English `Controls` label is now asserted both on entry and after ES/EN
round-trip in v8. Its small portrait crop capture is retained as visual evidence.


## Structural invalidation review

The main review identified that crate/actor creation and retirement could mark
camera volumes dirty. The candidate now invalidates only relevant building/wall
meshes and registered building deletions. Worker/crate simulation is untouched.
Twenty-one focused geometry/registry/controller checks pass after this change.
The CPU benchmark now additionally covers 100/1,000 native wall envelopes in
stable, forced-dirty and changing-hinge scenarios. Forced dirty deliberately
measures the full production refresh/filter path rather than motion alone.
A dedicated isolated Windows CPU job preserves these results independently of
the expensive packaged build. The clear-path report remains valid but alone is
not the acceptance evidence for structural refresh cost.

Final packaged run 38157033900 passed build, WebView2 smoke, genuine minimization
and recovery, then actual native menu Exit/restart. Raw process records confirm
create and restore exited=true, exitCode=0 (127842 and 89849 ms respectively).
These elapsed times include world startup and QA, not Exit latency. Restore
reports restartRestored=true, no errors; nativeProcess is recorded only after
the workflow observed actual process termination.


The structural refresh path subsequently became a queued per-entity update:
changing one gate updates only that gate; deletion explicitly retires its own
records and retains untouched pieces. The global fallback remains for initial
registration/reset. Twenty-three focused tests, including partial retention and
multiple removals, pass. The final CPU benchmark includes a genuine alternating
hinge and ten-piece removal/reappearance per frame. Earlier global dirty results
and the first static-hinge diagnostic are retained, not used as acceptance for
this optimized path. Packaged source e07 passed native Exit; the final PR CI must
also build/check the later rendering-only invalidation changes before merge.


## Isolated structural CPU cost

Hosted Windows run [38159425730](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38159425730)
measures source 49242c78, 500 warm-up + 2,000 measured updates per structural
arm, ABBA, and 1,000 wall envelopes with 15 nearby sweep candidates. All arms
are labelled CPU-only: there is no renderer, live simulation or physical mobile.

| Scenario / protection enabled | B1 p95 ms | B2 p95 ms | B1 p99 ms | B2 p99 ms |
|---|---:|---:|---:|---:|
| Stable walls | .0601 | .0447 | .0910 | .0603 |
| Forced global dirty reference | .5552 | .5466 | .6888 | .7200 |
| One gate changing every update, partial refresh | .0694 | .0915 | .0974 | .1622 |
| Ten removals + previous ten reappear, partial refresh | .1394 | .0986 | .2520 | .1590 |

Gate maximums .651/.661 ms; multi-removal maximums 2.594/1.709 ms. Forced global
refresh is an intentionally adverse reference, not the normal animated-gate path.
The unchanged clear path and contextual minimum use indexed local queries.
The older global-refresh run 38159176187 recorded gate p95 .2881/.3458 ms, but
these are different hosted runners; do not infer an exact percentage speedup.
Both raw reports are preserved. The optimized dynamic path has bounded observed
cost and is substantially smaller than reexamining the whole perimeter in the
same run. No FPS or physical mobile performance claim is made.

After the per-entity change, build and 23 focused tests pass; camera-dynamics-v4
repeats actual rendering, gestures, rotation/damage, streaming and portrait
resize with no exceptions or conflicts. Final mandatory Windows/Validate checks
must run against the final branch HEAD before PR and integration. Their complete
results and final review will be linked in the PR; previous packaged native
proof remains preserved and is not substituted for checking the newer renderer.


## Full-suite negative and corrected CPU fixture

Validate 38157036578 completed 3,989 passing checks, one failure and one skip.
The failure is `world-load-initial-far.test.js`: its CPU-only WorldScene fixture
provided only `controls.target`, so the newly enabled camera update attempted
`controls.update()` on an incomplete double. The fixture now uses real
`OrbitControls(camera, null)` and real object/chunk Maps. Its original early
region ownership assertions are unchanged. The corrected callpath and six
camera checks pass (7/7). An intermediate cleanup attempt called dispose on a
never-connected null DOM; this negative is also retained, and cleanup now runs
only when a DOM was connected. No production camera/controller check was removed.

The queued final validation 38159714135 still contained the known old fixture
and was cooperatively cancelled rather than repeating a 45-minute known failure.
Only that owned CI run was cancelled; campaigns and unrelated processes were not
touched. Final mandatory checks must validate the corrected fixture HEAD. The
production sources remain exactly 49242c78; this correction is test-only.

## Final packaged Windows proof and catalogue correction

Windows [38160568081](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38160568081) passed on f9232977. Its productive files are identical to 49242c78. Create and restore reports both show ok=true, errors=[], real Exit button found, nativeProcess.exited=true and exitCode=0. Restart reports restartRestored=true; committed versus previous ledger, plants, structures and villages are deeply equal. Elapsed 153480/168513 ms include world loading and QA, not Exit latency. Raw reports and log are preserved under raw-reports/windows-38160568081.

The same isolated hosted CPU run measures 1,000 walls: changing one gate B1/B2 p95 .0619/.0664 ms, p99 .0986/.0971 ms; ten removals/reappearances p95 .0928/.0862 ms, p99 .1480/.1145 ms. Maxima .4805/.6736 ms and 1.6901/1.5860 ms respectively. Synthetic descriptor inputs exercise productive registries/resolution; this is not a GPU or physical Android benchmark.

Validate [38160565608](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38160565608) completed 3,991 passing checks, one failure and one skip. The sole failure was the generated SFX catalogue inventory retaining the old scene.js hash after queued camera invalidation. Regeneration changes only that source hash: all 126 rows, classifications, assignments, file hashes and metadata remain exactly equal. Three focused catalogue checks pass. The negative full log is retained under validate-38160565608; a fresh complete gate must pass before PR/integration. No audit was removed or relaxed and no productive code changed in this correction.

Camera wall/gate bounds are conservative finite native mesh envelopes. Where frame and articulated leaf share a mesh, the envelope may also protect the open passage. Overflight remains available; this is a camera presentation limitation, not a navigation or simulation change.

## Complete validation and release review

[Validate38163747763](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38163747763) is SUCCESS on cae8ac15: 3993 tests, 3992 pass, zero fail, one skip (2101539.883 ms total test duration). Asset/web/audio/plan/balance/syntax verification, web build, relative web package and direct itch.io packaging all pass. The full raw log is preserved as validate-38163747763/run.log.gz.

Later closure changes are documentation/evidence only. Camera, Library, native exit and QA sources retain the exact productive version accepted by final Windows f9232977 and Validate cae8ac15; source-manifest.json identifies those files. The PR must still pass its automatically required checks before merging. No physical Android acceptance or isolated local GPU timing is claimed.
