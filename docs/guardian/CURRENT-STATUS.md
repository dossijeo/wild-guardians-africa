# Current delivery status (2026-10-29)

This is an index of current evidence, not acceptance of the entire phase. Earlier entries in PHASE2.md and CINEMATIC-RAGDOLL.md describe historical iterations; their pending lists must be read with the later evidence below.


**Native-world validation correction:** Historical guardian-combat fixtures without `lightingReview=1` use legacy JavaScript terrain. Their rigs, animation traces and isolated rendering costs do not prove placement, water-layout or performance acceptance in the current spatial-WASM world. The corrected lightingReview path now uses production world initialization; see `../lighting-reference/README.md` for the native mangrove checks and their exact limits. Grow/Attack snapshots and two hyena physical cycles have passed their narrow checks, but no full all-biome/concurrency/performance acceptance is claimed. The initial cycle had a non-repeated 1.25s render spike whose cause remains unresolved. Global lighting remains opt-in.

| Area | Current evidence | Remaining acceptance |
| --- | --- | --- |
| Guardian dialogue, face and wind | Eyelid revision, broader mantle weights and amplified wood/feather-tip wind installed; face-authoring/guardian; wind-wide/mantle-review; 62 offline voice sequences (including agricultural and Awakening additions) | Full requested continuous tutorial video with audio; perceptual review of all voice sequences; broader wind/artistic acceptance |
| Tutorial guidance | tutorial-real: actual game intro, HUD/world pointing, alternative first-center placement and next lesson; guide-orbit: camera/zoom replan and Grow handoff | tutorial-portrait: 390x844 HUD pointing/rest checked; full real-game portrait/world paths, continuous transitions and English walkthrough remain |
| Spell bodies and VFX | Single-instance controls and targeted tests; PHASE2, retained-attacks, multiply-branches, shield-night | vfx-scalar-review: new day/night four-spell videos, camera/zoom/consecutive casts; full occlusion/camera matrix and subjective audio review remain |
| Beast impact and recovery | Five species installed; shared-ragdoll-world, species-cycles, wall-cycle, stand-up-source | repeated-getup: all five species interruption runs recorded; buffalo wide-view follow-up stays in frame, warthog contact partially obscured; vfx-scalar-review adds rhino wall recovery and four-hyena/rhino 3-physical/1-baked cycles; peer separation and retained offset fix tested on hyena; full terrain/obstacle/direction/concurrency matrix and changing obstacles remain |
| Worker faces | Current strict catalog audit: 9/9 animal+worker profiles have blinkL/blinkR/mouthOpen | Remaining local facial seams in worker models; broader in-game visual acceptance |
| Older male installed repair | Cheek repair registered after moving portrait and daylight WorldScene review; recovery rebound and all four boundary tests pass; ten facial bindings | Broader facial/lighting acceptance; local normal detail is attenuated in the repaired cheek/nose mask |
| Editable sources | All ten actor Blend files reopened with readable packed images | Persistence check does not certify artistic quality |
| Performance | gpu-current: five interleaved frozen-frame component comparisons | moving-current: sequential moving-raid measurements and scalar packing comparison; incremental cost and frametime tails still unaccepted; unrelated baseline performance assigned to another agent |

The current olderMale candidate hashes are in face-authoring/olderMale/candidate-files.json. Earlier v7 reports bind the previous revision; cheek-frame contains the current geometry/clip audits and world-cycle recording. The latest olderMale candidate is now runtime registered. The full objective remains active and no merge to main is authorized.

Latest focused revisions: vfx-scalar-review now includes buffalo normal-only registration, baked wall-contact temporal refinement, recovery CPU attribution, corrected full-body/vortex summon framing after camera changes, and twelve-second close wind recordings. These supersede the corresponding older diagnostic observations without closing the remaining acceptance matrix. PR217 remains open; no merge performed.

Integration check at b59c79b94: all 171 tests across the 30 selected Guardian/beast/baked/authored-recovery/worker-recovery test files pass (zero skipped). Production build passes in 9.47 s; existing chunk-size and mixed import warnings remain. Exact file selection and command are recorded in phase2/vfx-scalar-review/integration-checks-current.json. This is not a full repository-suite pass, a browser performance result, or closure of the outstanding visual matrix.

Latest integration at 8c8898489: refreshed origin/main and verified zero commits behind. All 172 selected Guardian/beast/baked/authored-recovery/worker-recovery tests pass, zero skipped; production build passes in 10.18 s with existing warnings. Exact revision and file list: phase2/vfx-scalar-review/integration-checks-latest.json. Registered buffalo dorsal mask and reduced vortex ribbon passes are included. Recent ABBA runs still show worse frame tails with summons; no performance acceptance. Mixed hyena/rhino fall and recovery diagnostics show no sampled collider penetration, while falling mesh AABB overlaps remain geometrically inconclusive. Continuous voiced tutorial capture remains unresolved.

Integration at 99533cb4a: origin/main remains fully incorporated (zero behind). All 174 tests in the 30 selected Guardian/beast/baked/authored-recovery/worker-recovery files pass without skips; production build passes in 8.40 s with existing warnings. Receipt: phase2/vfx-scalar-review/integration-checks-99533.json. This includes the rhinoceros contact-hold fix, expanded placement regression and subsequent directional runtime recordings. Real moving-campaign runs preserve identical outcomes with presentation enabled/disabled, but both remain slow and do not establish performance acceptance. The full objective remains active.

## Integration checkpoint at 3451a5fe8

199 tests pass in 33 selected Guardian/beast/baked/authored-recovery/worker-recovery/spell-card test files, with no failures or skips. Production build succeeds in 8.54 seconds with existing warnings. Exact file list and scope: phase2/integration-checks-3451.json. Main-game Attack now has a continuous silent canvas recording through normal HUD controls, including fall and recovery; see phase2/attack-main-gameplay-recording.md. Full objective remains active: voiced tutorial recording, broader visual/audio matrix and added-cost performance acceptance are still incomplete.


## Terrain recovery and audio checkpoint at 1990136cf

World Guardian presence/launch audio now uses two replaceable voice slots; day/night recordings admit all requested cues without increasing mixer budgets. A captured repeated-hit hyena roll failure was reproduced deterministically and corrected with Rapier internal terrain-edge handling. Heavy bodies receive only a bounded progress-dependent recovery grace. Tests cover all five shipped rigs and retain a failing negative control for the old unstable terrain. See phase2/roll-timeout and day-spells-audio-review.md.

Actual corrected night run reports no roll failures; buffalo daytime automatic/lateral recordings also complete authored recovery and release physics. The latter inspected support samples and contact sheets are in phase2/roll-timeout/buffalo. These are scoped graphical checks, not acceptance of every terrain/contact combination or a performance benchmark. Full phase and continuous voiced tutorial recording remain incomplete.


## Guardian presentation buffer optimization (362e7019f)

Component isolation attributes the controlled static-scene regression to discharge rendering, not the body, aura or vortex. Marking the continuously rewritten beam matrices DynamicDrawUsage improves Guardian p95 from approximately 66.5 ms to 49.9 ms. Static reversal reproduces 66.5 ms; restored dynamic reproduces 49.9 ms. Evidence: phase2/performance-components. No visual content or baseline renderer changed. Moving-incursion comparison remains required; this supersedes the old static-fixture performance result only within its measured scope.

## Sustained native raid comparison (a71189724)

The moving comparison requested after the buffer optimization is now recorded in phase2/performance-components/fresh-raid-comparison.json. Both runs use the real night planner, 16 initial beasts, normal costs/cooldowns and five attacks over 60 simulation seconds. Commands and recorded final gameplay outcomes match exactly; no errors, roll failures or lingering physical simulations; at most one Guardian. Reference/Guardian mean FPS are 8.923/8.935 and p99 frame times 183.060/182.880 ms. Both contain a severe initial frame spike (10.509/10.759 seconds). This sequential pair shows no observable added regression in these measurements, but does not establish globally fluid gameplay or attribute the shared spike. Baseline performance remains assigned to the other agent. The static reversal evidence and all broader acceptance limits remain applicable.

## Active summon disposal

Disposing during an active summon now clears guide/effect state and diagnostic counters before releasing GPU resources. Repeated disposal returns without releasing the same resources twice. A regression test fails on the old active counter and verifies zero scene children, zero active/retained counts and exactly one disposal event per owned geometry/echo material. All 19 singleton, retained-projectile and tutorial-lifecycle tests pass; production build passes in 10.04 seconds with the existing mixed-import/chunk-size warnings. This is lifecycle validation, not new graphical acceptance.

Recovery peer update: ordered physical recovery contacts are enabled (24452b259). Four-hyena and daylight hyena/three-rhino runs finish all recoveries with no sampled strict surface crossings; recordings and frame/phase telemetry are in phase2/skin-crossings. This is bounded evidence, not all-species/obstacle acceptance. Manager-only telemetry does not yet cover release-to-navigation continuity.

Latest recovery updates: world-space .3s release blending is installed; one real hyena projectile interrupts it at166ms and recovers successfully. Terrain-aware foot support fixes the observed rhino penetration in the audited mixed cycle. Reduced support sampling costs .93�1.00ms p95 across20 calls/frame in controlled in-game blocks; broader pose/slope and total-performance acceptance remain open. Evidence: phase2/skin-crossings/README.md. Tutorial voiced recording remains unavailable due the native browser URL verification/capture limitation.

## Awakening and HUD checkpoint at cdacfae01

- Awakening V9 original ES/EN audio is imported unchanged; offline Rhubarb cues and six agricultural additions bring the installed bank to 62. Browser checks and package audio/hash validation are in [awakening-voices](awakening-voices/README.md). New cues remain automatic/unreviewed; this is not full perceptual approval.
- A 2.8-second single-Guardian ritual commits the blessing safely at confirmation and reveals its persistent visuals at the 2.05-second pulse. Closed eyes, forward lap palms, descending turquoise leaves and the existing vortex are recorded for a plant and wall in [awakening-ritual](awakening-ritual/README.md). The video is silent, uses QA charge replenishment and camera changes between shots, and is not a campaign walkthrough.
- The real-engine interruption fixture passes all four spell replacements at 0.65 seconds: one visible Guardian, committed blessing revealed, charge and blessing total unchanged. [Raw results](awakening-ritual/interruptions.json). It uses a presentation-only clock and does not prove recovery/navigation or artistic transition quality.
- The voiced HUD fixture exercises both Awakening languages. Button labels now retain Awaken/Despertar during target selection; English Grow fits its button. [English capture](awakening-guide/labels-en.png), [Spanish capture](awakening-guide/labels-es.png). Eighteen HUD/feedback tests pass after updating the obsolete Awakening label assertion to Awaken; graphical checks verify the final correction.
- Latest production release audit passes resource references and the file-count gate, but FAILS the 500 MB gate at 580,905,909 bytes. See [release audit](release-audit-20261029.md). Do not claim a passing release package or infer a cause without a comparable baseline.

Full phase acceptance remains open, particularly incremental performance, the remaining visual/audio matrix and continuous voiced tutorial recording. No merge performed.

## Integration checkpoint at bf16322b0

345 tests in 60 selected Guardian, beast/worker recovery, Awakening and tutorial files pass, with no failures, cancellations or skips. Production build succeeds (535 modules, 10.86 seconds, existing warnings). [Exact file selection and receipt](phase2/integration-checks-bf163.json). This includes the final Awaken/Grow labels and ritual replacement fixture source; browser execution evidence remains separately scoped above. This is not full repository, visual, audio or performance acceptance.

## Component optimization checkpoint at 1ac423844

[Ribbon upload reuse](phase2/ribbon-buffer-reuse.md) preserves all 18 effect geometries while avoiding temporary geometry storage and copying. [Peer collider caching](phase2/recovery-peer-cache.md) shares immutable shape data and retains live transforms. Both have sequential browser measurements supporting lower component cost; neither proves global FPS acceptance. The mixed real recovery run completes three physical plus one baked actor with one Guardian and no final down actors. Exact reports, tests and known diagnostic overhead are linked above. PR217 now includes these results and keeps its open acceptance list.

## Main-game ritual and obstacle inspection

Plant and wall confirmation/cancellation are exercised through the real main-game UI; plant confirmation autosave survives browser reload. See [wall flow](awakening-ritual/main-game-wall.md) and [plant reload](awakening-ritual/main-game-plant.md). A nearby-wall height adjustment and lateral/elevated fallback search improve the observed obstacle cases. [Full-resolution tower inspection](awakening-ritual/full-resolution-review.md) shows the Guardian clear of the roof at the sampled pose, while the target remains behind it in this fixed QA camera. This does not close the general camera/obstacle matrix.

[Placement query pruning](awakening-ritual/occupancy-pruning.md) preserves 64 reference decisions with fewer visibility/occupancy queries. Warm browser timings remain variable; no global performance approval. Continuous voiced tutorial video, broad audio/artistic acceptance and the release size gate remain open.

## Delivery review at de1693154

This review corrects stale descriptions; it does not mark the phase complete. The latest implementation/evidence is indexed in [pose-layer-fix](phase2/pose-layer-fix/README.md). Historical documentation above must not be read as either a current failure or a current pass without its revision and scope.

| Requirement | Current evidence inspected | What remains unproven |
| --- | --- | --- |
| Broad mantle/feather/wood wind | Installed-rig binding correction; 24 bindings; increased distal amplitudes; age-zero Grow/Multiply/Shield/Attack recordings | Continuous close artistic review across the useful camera views; sampled sheets do not certify fine intersections |
| Four spells, hand origins, one body | Current singleton/pose tests; differentiated branch/beam/dome effects; four-spell native recordings | Main-game end-to-end review of the latest combined revision, including realistic consecutive different spells |
| Placement and camera | Native building-side recordings; larger solid envelope; unchanged world anchor during rotate/zoom | Dense terrain/occlusion cases at useful gameplay zooms. Arbitrary orbit can still occlude a fixed world actor; this must not be 'fixed' by teleporting it to follow the camera |
| Robust interruption | Target removal across the contact marker reproduced failing before the fix; 23 singleton/audio tests; native before/after screenshots show all six effect objects cleared | Current graphical scene replacement/end-of-game with a nonempty visual queue |
| Directional fall/recovery | Five installed species; physical/baked concurrency tests and recordings; current rhino lateral and hyena recovery-to-retreat cycles | Latest-version representative slope/structure/peer checks, with visible mesh contacts rather than collider/AABB evidence alone |
| Damage/retreat/SFX | Hyena native run: hurt at 0.266435 s, retreat once at 8.362835 s after recovery, actor leaves; AAC track recorded | Perceptual audio mix and continuous synchronization review; playback admission is not auditory approval |
| Incremental performance | Historical static/dynamic buffer reversal and legitimate five-Attack native comparison; current component blocks and recovery-pose reuse evidence | Current matched live-incursion comparison after the final changes, with frame tails and exact outcome equality. Do not infer no regression from small animation CPU or mean FPS |
| Reviewable delivery | Commits pushed to codex/guardian-3d-animation; editable sources, balance/provenance docs, reproducible tests and evidence | PR description is behind recent commits after the previously reported automatic review rejection; no merge. Release size gate remains a separate unresolved packaging check |

Next acceptance work should prioritize the current graphical queued-scene interruption, then a matched live-incursion comparison and continuous visual/audio review. Repeating static screenshots of already covered spells is not a substitute. The unrelated baseline-engine performance investigation remains assigned elsewhere.

Other user follow-ups remain distinct and are not silently declared complete by a phase-2 check: continuous voiced tutorial capture, broad AO/lighting review, and the savanna HD texture task. For the latter, the exact current runtime tree GLBs have now been exported and linked to the user; no unapproved tree geometry or texture replacement was installed.

Current integration receipt: [integration-checks-de169.json](phase2/integration-checks-de169.json). All **355 tests in 61 selected files** pass, zero failures/cancellations/skips, 80.31 seconds. The retired detached-echo test is explicitly recorded, not silently skipped; singleton behavior replaces that removed subsystem. This is not the whole repository suite or a graphical/performance pass. The last production build at the preceding target-removal fix passed; this review changes documentation only.


### Queued presentation interruption — 2026-10-29

Executed the browser fixture with native WorldScene: four immediate QA Attack commands (cooldown bypass), one visible Guardian and three pending summons at age 0.12 s. Both final game result and a one-second presentation-clock rollback clear the pending queue and hide body, aura, beam, impact, core and vortex. Both receipts report zero captured errors. Evidence: `phase2/pose-layer-fix/queued-lifecycle-result.json`, `queued-lifecycle-rollback.json` and associated PNGs.

This closes those two presentation interruption cases only. It does not prove renderer disposal, production command cadence or scene replacement. The earlier shallow state-replacement experiment was invalid: native spatial movement requires its owning game state. That operation was removed from the fixture, not treated as a successful scene-replacement test.


### Pending presence audio freshness — 2026-10-29

Production presence requests now capture the owning simulation state and elapsed time. Arrival/dissolution decoding cannot start a voice after game result, clock rollback, state replacement, owner disposal, a different active world or pause. Previously the app checked owner identity, disposal, pause and audio age only; result/rollback/replacement could admit a late cue. The shared `playGuardianScenePresence` boundary retains existing distance gain and 0.4 s freshness window.

Validation: 36 tests passed across guardian-presence, guardian-presence-lifecycle, guardian-combat-audio and guardian-singleton. Delayed decoding uses AudioSystem with controlled Web Audio stubs and includes a positive current-scene case; this is not perceptual audio validation. Production build passed (12.25 s; existing chunk-size and mixed-import warnings). Existing scene shutdown already calls AudioSystem.stop, invalidates decoding generation and disconnects voices; no new audio engine or resource ownership was introduced.


## User-requested follow-up: texture clarity across all six biomes (2026-10-30)

The user rejected integration of the supplied replacement tree textures because their tone and brightness change too much. Do not integrate the previous HD/4K texture candidates or the rejected detailed-tree LOD models. Keep current production models and materials.

After the current outstanding work, this task is part of the thread objective: process the first five assets of **each of the six biomes** (savanna, desert, grand_river, mangrove, canyons, volcanoes), 30 assets total. Use the isolated current-runtime GLBs in docs/lighting/biome-retexture-sources; export the fifth savanna asset as well (existing savanna comparison exports cover only four).

Requested workflow: import the current models in Blender, render reference images of their existing appearance, then use the **imagegen skill** to create clearer textures based on those references. Read and apply that skill when executing this phase. Project/rebake the generated detail onto the original surfaces; preserve original geometry, proportions, pivot, UV compatibility and the established palette/material response. Preserve and validate normal/PBR maps; do not replace them blindly with generated color or baked lighting.

Acceptance: increased legibility of foliage/bark/large-element detail without perceptible palette, brightness or gloss shifts. Compare fixed-camera, matched-lighting original/candidate views, close and gameplay distances, in day and night for all six biomes. Check seams, projection alignment, leaf cutouts, normal direction and material response. Image generation is not proof of color/material preservation: reject or correct candidates that drift. Document texture residency/size and validate runtime cost before integration. Integrate only after the candidates pass those visual and runtime checks.

Status: queued after existing pending work; not started and not completed. This addition does not close or replace the Guardian phase-2 acceptance requirements.


## Main-game Attack input integration (2026-10-30)

Development-only `qa-main-attack` probe exercises real Power/Attack buttons and canvas pointer/raycast selection on an ordinary Suajili save. Two accepted attacks on the same buffalo, real 12 s cooldowns, health 140 → 112 → 84, maximum one Guardian, both recover and resume attacking. First/second recovery returns to normal at 7.067/8.182 s. Exact receipts, screenshots, method and limitations: [main-ui-attack-probe](phase2/pose-layer-fix/main-ui-attack-probe.md). Input is synthetic and the screenshot views are distant; this does not establish human/touch usability, continuous artistic acceptance, palm origin or full collision/performance acceptance. Production build passes and removes the opt-in probe.

Continuous capture follow-up: `phase2/pose-layer-fix/main-ui-lion-recording.mp4` records one actual main-game raid Attack plus full recovery and resumed movement with real cooldowns, 15.24 s, audio track present. Overview/contact frame sheets inspected; exact scope and remaining visual/listening limitations are in main-ui-attack-probe.md. This improves input-to-render evidence without closing the full phase acceptance matrix.
