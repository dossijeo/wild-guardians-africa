# Remaining integrated release gates — 9 October 2026

This is an incomplete-work register, not a release approval. The current-state
update below supersedes the historical checkpoint text that follows. Earlier
sources, failed candidates and measurements are retained, not silently changed
into current-main acceptance.

## Current-state update on main 1ed8be18

### Later Windows evidence and its limits

The exact packaged main executable from `2a910b83` now has local original-tester
PASS evidence for both New Game and Continue/native minimization. Its source,
artifact and executable hash are pinned in
[the original reports and receipts](windows-local-main-2a910b83/README.md).
The Continue report preserves all21 measured simulation fields over300,821.7ms
of genuine hiding and resumes with the menu pause retained correctly. Root
rechecked both gzip payloads against their original byte counts and hashes,
including the full hidden-state comparison. This is an archive recheck, not a
new runtime test.

The same executable's CI loading test failed. Local acceptance covers one
Gran Cañón/Mapungubwe configuration and environment; it neither establishes the
CI failure's cause nor approves every Windows device, biome or save. The
last fully green Windows workflow remains
[37922095376, source57527dc9](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37922095376).
The28.038s and343.500s local process lifetimes include preflight and, for Continue,
the required five-minute hidden test; they are not world-loading benchmarks.

Main `0c77365c` adds smoke-only presentation observations at report completion:
stage busy state, displayed progress/title, focus, visibility and canvas size.
World wait duration stops at the original stage-ready gate so the hidden test
is excluded; `66b47414` exercises that timing boundary. Five directed tests pass.
These fields do not establish GPU identity or make displayed progress a readiness
gate. Original90s readiness and300000ms native hiding requirements are unchanged.
There is not yet native evidence from an executable containing this observation
change. Separate fluid-depth and worker candidates remain unpromoted until their
actual native/visual/performance gates pass.

The full objective remains the master plan plus the user's subsequent changes.
The original 159-case registry has 157 historical verified labels and two partial
cases (QA-014 and QA-156). Those labels retain their original sources and scopes;
they do not establish final acceptance of all later features on this main.

| Requirement | Authoritative current evidence | Remaining acceptance |
| --- | --- | --- |
| Authored V4 crops with FrontSide | PR17 merged at `81d87953`; 40 states/32 bridges, source/attribute/morph contracts, native fixture and exact-head Validate/Windows evidence in [root review](crops-v4-root-integration-review.md) | Workers remain a separate repair category. Do not reuse the abandoned crop-repair experiment as evidence for authored V4 or claim all device/culture visual coverage. |
| Interactive loading and visual/audio refinements | PR18 merged at `53a4a996`; user accepted G's load/responsiveness compromise; actual New/Continue, cancellation, shared V4 ownership, progress and camera evidence in [production G](interactive-loading-development/production-g-final/README.md) | Current Windows loading smoke fails at its unchanged deadline; diagnostic and opt-in compiler candidate remain separate. Physical peak RAM/VRAM and complete current mobile coverage are unproven. |
| Native menu library fullscreen | Actual native entry corrected by `7b8d5fb0`, included in `f5e796c2`; [controller, build and package evidence](library-native-integration/README.md) | Earlier fullscreen evidence covered a different entry. All four actual labs in portrait/landscape still need rendered acceptance; CUA initialization currently fails. |
| Full web validation of library/routing integration | [Run37934148381](validate-f5e796c2/README.md) passes 3719/3719 tests, assets/audio/plan/balance/syntax/build/package on exact `f5e796c2` | Later changes have independent CI. This is not Windows, physical visual/audio or campaign-matrix acceptance. |
| Spirit narration lifetime | `1ed8be18` separates buffered download stalls from actual playback waiting; [22 directed tests, pre-fix failure, build/package](spirit-buffered-stall/README.md) | Real audible regression acceptance remains open. Media doubles do not identify the original physical event sequence. |
| Responsible campaign economy | Historical Desert/Sahelian run37895465546 wins100 nights with21.7233% inactivity; [retained summary](campaign-balance-recovery/desert-saheliana-37895465546/desierto-saheliana-summary.json). Current Canyon/Sahelian survives10 but records77.5333%; [physical-domain and budget attribution](canyon-budget-f5e796c2/README.md) | Current30-combination100-night survival/accounting/activity and bad-management coverage remain open. The economic agent tests isolated real-parameter candidates with unchanged strategy/gates; none is promoted. |
| Stable camera traveling | [Explicit user acceptance](streaming-travel-dense/user-acceptance-2026-10-09.md) closes this point absent a reproducible regression | Older negative candidates remain disabled; do not keep this accepted point open solely because historical traces contain spikes. Loading preparation is a separate requirement. |
| Post-Jam camera close-up protection | [Specification and optional geometry prototype](../camera-close-protection-post-jam.md) | Normal gameplay activation, model margins, trees, secondary fade, controls/streaming visual acceptance and physical mobile remain open. |
| QA-014 hidden web/mobile tab and QA-156 full gameplay A/B audio | Original registry still marks these partial; Windows hiding and individual spirit clips have narrower scopes | Complete physical web/mobile hidden-tab and perceptual/full-campaign audio proofs remain necessary. |

The physical Pixel/Chrome/itch Wake Lock acceptance remains accepted and is not
a priority absent regression. SFX126 inventory has100 assignments and26
reservations/alternatives/context exceptions; this is a source/caller audit, not
complete audible trigger coverage. Continue remaining post-Jam work from the
[pending list](../post-jam-pending.md), retaining scope and current user overrides.

## Historical checkpoint details (superseded where noted above)

The following notes originally described PR16 at `4ecffec5`, older rendering
base `795f773e83640d3f7541d8e3d826764c3d779750` and work before PR17/18 merged.
Statements that features were unmerged or checks were live are historical.

## Responsible campaign acceptance

PR13 at `6ac2b672` archives sixteen original terminals from frozen `3324d17d`:
eight victories pass the strict daylight inactivity threshold below 25%; four
Canyon victories and Desert/Mapungubwe fail that threshold; three Desert
incursions remain unresolved in that sixteen-case archive. The seventeenth
original, Desert/Saheliana job 113646986727, has now ended in failure at day 100,
99 completed nights, with an unfinished retreat. Its full original failure is
retained; no final report, victory or activity approval exists. Neither
unfinished campaigns nor victories above the threshold count as complete release
acceptance. These sources precede the marginal legacy retreat recovery in PR12.

Root independently verified all 156 payload receipts of the sixteen-case
PR13 head `6ac2b672`: 200,435,248 original bytes, including gzip integrity,
JSON decoding and recorded source-count/activity fields. This does not rerun
simulation or independently repeat the original source/domain audits.
Both exact-head CI checks passed, and PR13 is merged as `dbe4d1ed`.
This integrates the archives, not approval of their rejected/unfinished cases.
See [the expanded receipt](campaign-ci/root-pr13-expanded-archive-review.json)
and [reproducible verifier](campaign-ci/verify-root-archive-receipts.py).

The final original was subsequently integrated from `747247fe`. Root's expanded
byte/receipt check passes for all seventeen archives: 163 original payloads,
214,785,301 bytes. See [the seventeen-case receipt](campaign-ci/root-seventeen-archive-review.json)
and [the final failure](campaign-ci/current-3324d17d-terminals/desierto-saheliana-37876748172/README.md).
This archive check is not a new domain/source audit or a current-main recovery
replay. A subsequent native replay against PR15 remained stationary for 300
simulated seconds. PR16 (`ee1954c2`) proposes actual footprint-corner connectors
for the physically open subcell passage missed by the existing lattices. The
original snapshot then exits physically in 18.1 simulated seconds; 103 tests
pass. Root reviewed the bounded fallback and its original-state/dt/reload tests.
Both exact-head checks now pass. Root independently repeated 14 directed tests
and merged PR16 as `4ecffec5`, then pulled main. See [root review and exact scope](saheliana-final-raid/root-pr16-review.md).
This saved-state recovery is not a new hundred-night campaign.

Root dispatched a new original-policy Desert/Saheliana hundred-night campaign
on immutable main `0544d652`, plus the existing separate poor-management
diagnostics across six biomes. [Run identity](campaign-ci/current-pr16-dispatch-37895465546.json)
records run 37895465546 and both job IDs. Both were observed in progress at
checkout; only authoritative subsequent job state/artifacts may establish
completion. The old failure is retained and the activity/survival gate remains
open until terminal evidence is audited. The separate poor-management job has
now completed: root independently verified 324 source hashes plus the runner,
six native snapshots/accounting/delivery audits and exact summaries. Five
biomes naturally lose, while Canyon survives the ten-night diagnostic; neither
outcome is altered. See [current poor-management evidence](campaign-ci/current-pr16-poor/README.md).
The responsible hundred-night job remains separate and unfinished.

The three distinct saved Desert stalls now have bounded native recovery fixes
in merged PR15, with root 45/45 directed tests and both exact-head CI checks
passing. See [root review and scope](desert-raid-connectivity-root-review-2026-10-09.md).
This does not convert the original unfinished campaigns into victories.
Next proofs: measure actual
responsible reinvestment under justified game balance changes, retaining the
original policy/seed and negative records; complete the required biome/culture
coverage and bad-management loss tests. Static margins or short campaigns cannot
replace hundred-night survival, physical crate delivery and activity evidence.

The original income pilot `2bdac97e` has now completed 100 nights in Canyon /
Mapungubwe, with 15,200 physical deliveries, but still fails activity at 36.0967%.
Root repeated the source/snapshot/accounting audit: 321 hashes match and the
complete physical summary agrees. See [the review](campaign-balance-recovery/root-pilot-review/README.md).
The economic candidate remains unpromoted. Intrajornada task/route evidence is
needed before another balance adjustment; its final cleaned-up snapshot cannot
establish worker utilization.

## Interactive loading

`feature/interactive-loading-screen` remains unmerged. Its original acceptance
requirements and later visual/audio refinements remain binding. Root native QA
confirmed real pending-download cancellation on `31a5fa3e`, and persistent,
manually dismissible Spanish preparation-error feedback on `d69d7c68`. Those
observations do not prove peak RAM/VRAM or complete audio cleanup. Root actual
menu slow-load 908 reached verified readiness and gameplay; a native planting
gesture triggered SFX 028 and loading voices were empty after handoff. The
English failure 909 persisted with Dismiss, but retained a Spanish technical
detail. The later correction was confirmed natively on `e46a8da0`: English
technical detail, persistent notice, dismissal and cleanup, with no console
errors. This functional check is not a performance or memory measurement.

A thirty-combination functional matrix completed on frozen `1bf0fb0d`:
all thirty report readiness, camera/logical restoration and teardown, with no
pending downloads or errors. This is fixture coverage, not actual-menu coverage.
Concurrent light CPU work is declared: its timings cannot establish performance.
Even a complete matrix will not replace actual New/Continue menu paths, mobile
touch and orientation, reduced motion, cold/cache/slow progress behavior,
before/after total load and frame-time measurements, resource peak/lifecycle
checks or final day/night visual acceptance. No premature PR or merge.

The sequential main/feature loading ABBA on frozen `6ce847a9` / `e46a8da0`
found an unresolved readiness regression: reference 7.150 / 7.341 seconds,
feature 11.967 / 10.206 seconds, excluding its intentional 4.09–4.11-second
cinematic. Root inspected all four raw terminal and cleanup reports: no errors,
released contexts, and both feature logical/camera checks pass. Feature frame
delivery is smoother, but the reference heartbeat does not render a diorama;
this is not a GPU/FPS comparison. Cache/transfer drift and sampled heap limits
remain explicit. Investigate the extra world-load preparation before approval.
Raw evidence remains on the loading feature branch pending its final PR.

The latest reference-directed visual work is on that feature branch:
`d9c3a1fd` adds the generated wooden/vine/sunflower/parchment ornament, a closer
four-maize composition, mountain backdrop, one instanced sparkle draw and an
analytic light shaft in the existing mist pass. `6045fb98` fixes the visible
rectangular mountain base, soil saturation and portrait plant cropping. Root
inspected its native day/night landscape and stable portrait screenshots:
the composition is substantially closer to the supplied first mockup. The
transient night-portrait resize image is retained separately as a negative;
the narrow parchment hint still needed refinement. `c7c26463` addresses that
CSS fit; its functional capture is pending at this review. This is AI visual
screening, not user acceptance or proof of neutral GPU/peak memory cost. The
new backdrop may coexist temporarily with the world's atlas. Its before/after
render/resource measurements and the original loading-readiness gate remain
open. No loading assets or runtime have been promoted to main.

## Rendering and streaming

The native repaired mature-maize comparison has net GPU benefit, but is not
approval of all five growth states, morph bridges, other crops or workers.
Original rig/material/UV/animation compatibility, convincing in-game multiview
appearance and final controlled benchmarks remain necessary. Pixel differences
are diagnostics, not automatic rejection. No experimental asset is promoted.

Root's three native young-maize FrontSide stills confirm actual BACK culling for
all three colour groups, recognizable maize in day/night/elevated views, and
released contexts. The standalone archive check passes; shadows remain DoubleSide.
See [the retained images, original reports and limits](frontside-model-pilot/young-front-native/README.md).
This is limited AI screening, not full growth/WorldScene coverage, human-user
approval or the young candidate's own net GPU benefit.

Two subsequent sixteen-second native growth runs retain 1,752 chronological
frame records and ten capture moments. The incoming/outgoing original bridge
phases are preserved, and the young state has actual Front/BACK/CCW colour
witnesses where active. Root reviewed both full atlases; their independent
standalone receipt check passes. See [Front growth evidence](frontside-model-pilot/young-front-native-continuity/README.md).
This remains limited AI still screening with Double shadows; the record is not
a full-video inspection, a WorldScene/GPU benchmark or approval of other models.

Root also ran the young WorldScene resource fixture on frozen `4bb26a95`.
The image and teardown completed, but the report POST failed with
"Unexpected report": the server's initial status whitelist omitted the young
profile. The native console/status/PNG negative is retained by the repair
branch. `db62ee83` unifies POST/preflight status validation without altering the
viewer or geometry. The subsequent root native repeat exported its original
resource receipt successfully: 1,257 instances, 68,996 additional observed
buffer bytes during coexistence, actual Front color and world-depth witnesses,
unchanged inputs, and released context. The branch archives the successful
repeat separately from the failed export; this is resource evidence, not GPU
timing or promotion of the old candidate.

The user has replaced the crop repair experiment with the supplied
`Bioma_Cultivos_Lab_V4_Culling.html` inside `1-biomas.zip`. The old young-crop
timing/repair research is stopped. Integration now uses the supplied compatible
40 crop states and 32 transitions, baked reproducibly from that lab, compressed
without breaking attributes or transition correspondence, then checked for
functional and visual compatibility. This work is on `codex/lab-v4-crops-frontside`
from `1e353f8f`; no new crop assets are promoted yet. The experimental branch and
its negative/positive evidence remain preserved.

Root's isolated original-environment comparison on `5be52f44` has 3,360 valid
GPU samples across Sabana and Mangroves. Total mean savings are 13.9% / 16.9%,
with all four paired total/color differences positive. Shadow-only gains are
inconsistent. The user accepted the six before/after visual pairs and explicitly
authorized activation for every biome. `5e51cf45` enables native prop color and
shadow FrontSide, including their private solid shadow input. 37 directed tests
and native Front/BACK/CCW smoke checks in all six biomes pass. After disk space
became available, root's `e20bf93a` build, web-package verification and itch ZIP
CRC check passed. CI remains separate: runs 37901173427 / 37901173610 on
`1994b7a8` were still executing at the last observation, and the newer `e20bf93a`
runs were pending. These are not new six-biome performance or exhaustive night
measurements. See [the activation and evidence](environment-frontside-ceiling/production-front/README.md).

The standby-pruning traveling comparison is negative and stays disabled. Shared
resident preparation also has a completed root native AB/BA comparison on
frozen `795f773e`: all four p95 frame intervals are 116.4 ms, with 1004 GPU
queries, unchanged logical state, and released contexts. No demonstrated
frame-stability benefit; it remains experimental. The immutable reports and
reproducible verifier are now in main at `cad08d84`; root verification passed.
A separate seam-preparation isolation candidate (`4390237e` versus frozen
`795f773e`) now has a root native ABBA: 1005 valid GPU queries, all four
logical states unchanged, 25-to-40 generated chunks, no errors or pending
queries, and released contexts. Its p95 frame intervals are 116.5 / 116.4 /
116.4 / 116.4 ms; intervals above 100 ms are 25 / 22 / 23 / 18. This does not
demonstrate a general frame-stability improvement and does not approve activation.
Raw reports are archived in main at `b91b06c7`, and root's verifier passes with
`performanceAccepted:false`. See [the negative result and clock attribution](streaming-travel-dense/seam-isolation-abba-b6edd148/README.md).
The
separate instrumented functional runs end with zero observed live buffers;
their timing is not used in the benchmark. All draws, uploads, queries and cleanup
must be attributed without summing union statistics counted in multiple adapters.
The requested outcome is stable movement during new chunk/impostor preparation,
not a higher average FPS at the expense of travel spikes.

## Other explicit pending requirements

- The 126-SFX source/caller audit is integrated through PR14 (`6ce847a9`):
  100 assigned, 26 reservations/alternatives/context exceptions, exact bytes
  verified. Root freshness check and three audit tests pass on merged main.
  Audible/trigger acceptance remains pending; later runtime changes require
  regenerating and reviewing the inventory.
- Camera close-up protection, final horizon/backdrop direction and the remaining
  post-Jam requests remain tracked in [the pending list](../post-jam-pending.md).
- QA-014 still lacks the complete physical web/mobile hidden-tab acceptance
  described in its registry; native Windows evidence has a different scope.
- QA-156 still lacks its documented perceptual/full-campaign audio acceptance.
  Root native English Spirit QA independently confirms natural audio completion
  and retention of the current presentation while a real centre action advances
  tutorial logic. See [the evidence](library-spirit-ended/english-natural-914/README.md).
  This fixture does not cover all voices or full gameplay audio.
- Published itch.io Wake Lock has physical Pixel acceptance from the user;
  additional work is not a priority unless a regression appears.

Green builds, numerical auditors and isolated fixtures must retain their exact
scope. Close each gate only against current, requirement-matching evidence.
