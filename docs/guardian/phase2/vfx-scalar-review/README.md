# Scalar VFX packing: daylight visual check

Recorded on 2026-10-28 at c528f899f using the actual WorldScene fixture, production actor catalog and spell commands. UI: Activate sound, then Grabar dÃ­a. This is a controlled scene with cooldown reset, not a campaign gameplay recording.

`day.mp4` is a 22.437-second canvas capture with an audio track. The sequence exercises Grow and Multiply, camera rotation, zoom and two closely spaced commands. `day-contact.png` samples it once per second. Review shows visible helical arrival ribbons, crop-directed energy and disappearance, with no obvious broken triangles or persistent Guardian in these samples. Full-frame continuous artistic/audio acceptance is still pending; an audio track does not establish a listening review.

`day-status.json` records zero errors, at most one visible Guardian and no active summon at the end. The daylight recorder does not exercise Shield or Attack. These and the broader occlusion/terrain matrix remain outstanding.

Validation: production build passed after registering the compressed olderMale asset; all 9 vfx-native tests passed, including source parity of all 18 compositions. This capture is not a performance benchmark. Moving-scene timing evidence is in ../moving-current/.

## Night check

`night.mp4` (25.077 s, 1280x720, video and audio) exercises Attack, Shield, camera rotation/zoom and repeated attacks using the same UI recorder. `night-contact.png` samples once per second. The reviewed samples show the protective dome, hand-to-target energy, rhino knockdown and the final hyena lying down then returning upright. They do not establish frame-accurate impact timing or anatomical quality from every angle. The fixture replaces the selected animal partway through the sequence; this is not proof of simultaneous multi-animal recovery.

`night-status.json`: errors [], maxVisibleGuardians 1, active summons 0, physical bodies 0, rollFailures 0. The trace includes existing spirit/audio events; mix quality has not been certified by listening. All 22 beast-combat-physics tests passed. Those tests ran during part of recording, so no performance conclusions should be drawn from this capture.

## Rhino beside a wall

`rhino-wall.mp4`, `rhino-wall-contact.png` and `rhino-wall-status.json` extend the earlier hyena/buffalo wall coverage to the catalog rhino. URL recoveryDay=1&wallLow=1; select rhino and Grabar caida contra muralla. This uses the existing QA wall (10000 HP, delayed initial swing), real Attack and Game.tick. No audio was enabled after the page reload.

The run completes 12.121 simulated seconds through falling, rolling, recovering and walking, with 32 sampled structure-contact pairs, zero roll failures, zero final down actors and no errors. Contacts include nearby structures, not exclusively the wall. The one-second image samples show the rhino falling on the approach side and returning upright beside the wall; they cannot exclude small skin intersections. During rising the limbs visibly lift, and this wide low-angle view is insufficient to approve the exact foot support. No blanket obstacle or anatomical acceptance is claimed.

### Rhino get-up detail

`rhino-getup-detail.png` samples seconds 5–10 at 3 Hz. The crop improves leg/body readability but clips the actor at its right edge in some frames. Across 36 recovery samples, minimum sampled non-tail support is 0.0100–0.04685 m. At recovery age 0.083 s the forearm is the lowest sample while feet are still raised; by 0.532 s a foot is the support limiter. Later support transfers between feet and a hand. The reviewed samples do not show a gross root-height jump on returning upright. This is evidence for this one wall-side cycle, not a general all-vertex collision or slope certification.

## Four-impact lifecycle run and framing defect

`four-impact-status.json` reports 16.019 simulated seconds, four targets, peak three physical ragdolls and one baked fallback, one physical-budget rejection, zero final down actors/bodies/errors, zero hidden frames and maxVisibleGuardians=1. All four resume walking/attacking.

`four-impact.mp4` and its one-second sheet expose a QA camera defect: the non-wall trial inherited the previous low wall camera, leaving actors small/occluded. This recording is lifecycle evidence only, not visual acceptance of all four reactions. The fixture now restores its standard camera for non-wall physics trials. A new visual run is required after that fix. Capture is silent and contains diagnostic support sampling; no performance conclusion is drawn.

### Repeated with reset camera

`four-impact-framed.mp4`, its contact sheet and separate status JSON repeat the four-hyena trial after the camera fix. All four actors now remain within the strategic view through falling, rolling, recovery and resumed activity. The trace independently records those phases for each actor, peak 3 physical + 1 baked, final down count/bodies 0, maxVisibleGuardians 1, hidden frames 0 and errors [].

Reviewed 1 Hz frames show visibly distinct falls and staggered recovery; neighboring silhouettes overlap during part of the get-up sequence. This view establishes that the lifecycle remains visible but does not measure inter-animal mesh penetration during authored recovery. That contact quality remains open. The recording is silent, uses QA cooldown resets and diagnostic sampling, and is not a comparative performance run.

## Pair-contact diagnostic

The four-impact fixture now samples Rapier contactCollider distances between different physical actors when at least one is recovering. This is QA-only pairwise work at approximately 10 Hz. `peer-contact-status.json` contains 95 pair samples, all with no negative contact distance, zero runtime errors and a completed cycle. Thus this run does not demonstrate physical-collider penetration between the three Rapier actors.

The fourth baked actor has no Rapier colliders and is excluded. Skin can also extend beyond simplified colliders. This result neither approves skin-to-skin contact nor resolves the baked/physical interaction. The measured camera overlap alone does not justify adding root displacement. Production physics has not been altered based on this diagnostic.

### Include the baked actor: deformed mesh broad phase

Optional `peerContacts=1` now enables both diagnostics; ordinary timing runs do not run these costly vertex queries. The mesh diagnostic computes world AABBs from every deformed vertex of active physical and baked actors. Disjoint boxes establish separation; intersecting boxes are candidates only. A focused test verifies translated physical/baked boxes and candidate classification.

`peer-skin-status.json` records a completed four-impact run without errors: 150 pair samples, 27 intersecting-box candidates. Of 75 physical/baked pair samples, 19 are candidates. Therefore the prior Rapier-only result cannot dismiss the visible overlap. Triangle-level or contact-region inspection is needed before adding separation to recovery. No production displacement has been introduced from these conservative bounds.

### Confirmed baked-skin / physical-volume intersection

`peer-volume-status.json` adds exact Rapier containsPoint queries for baked mesh vertices within candidate physical-actor AABBs. In this completed run, 22 candidate pair samples include 13 samples with baked vertices inside physical colliders, maximum 3463 vertex records in one sample (duplicates at UV/normal seams count separately). The worst pair is qa-beast-1 / qa-beast-3, collider parts 1–3. This establishes intersection with the simplified physical volume, not an exact triangle-to-triangle penetration depth.

Two focused diagnostic tests pass, including real Rapier positive/negative containment. The result exposes an unresolved baked/physical separation defect; do not describe the four-actor visual acceptance as passed. The next production change must constrain the baked trajectory/recovery against moving peers while preserving smooth motion, static-solid clearance and logical-position reconciliation.

## Rejected peer-box production experiment

Two production experiments extended BakedSolidContacts with moving peer boxes. First, sampled skin bounds reduced the observed maximum to 916 baked vertex records inside physical volumes, but five offending samples remained (`peer-separated-status.json`; `peer-separated.mp4` is this unaccepted diagnostic capture, not an approved result). Second, bounds derived directly from current convex/capsule colliders still produced a maximum of 2659 (`peer-collider-experiment-status.json`). Counts are from separate variable-rate runs and are not a controlled percentage-improvement comparison.

Both completed without runtime errors or retained down actors. All 26 existing combat/static-solid tests passed, demonstrating that those tests do not cover the observed peer failure. The experimental production edits were restored; `peer-box-experiment.patch` preserves the rejected second variant for investigation only. It is not applied. The overlap defect remains in the branch and requires a different contact-resolution approach. No claim of visual smoothness is made for these experiments.

## Combined obstacle resolution

The diagnostic replay (`peer-unresolved-status.json`) found every penetrating sample still intersected an obstacle after four sequential box corrections. The new fallback computes a horizontal translation clear of all vertically overlapping peer/static boxes together when sequential correction fails. Dynamic peer envelopes come from current Rapier hull/capsule transforms; baked peers have deterministic priority. Static-only resolution retains its existing path.

`peer-clear-status.json` and `peer-clear.webm` record the next four-hyena run: no baked vertices detected inside physical colliders, completed recovery, zero runtime errors and no final down actors. The 2 Hz contact sheet shows the group falling and resuming activity. This is one variable-rate run, not proof of every contact or smooth per-frame displacement. Crowded corners, displacement continuity, performance and additional species remain to be validated.

Two new combined-box tests and all 26 existing combat/static-solid tests pass. The earlier peer-box patch remains rejected historical evidence; the applied version adds the combined clearance search.

### Static-wall crossing regression

A new deterministic case demonstrated that the combined endpoint search could choose a clear destination on the far side of a thin static wall. The test failed before the change. Candidate translations now sweep the actor AABB against previously clear static obstacles; moving peers remain separable and an existing static overlap may escape. The three offset tests plus the buffalo/rhino baked-wall tests pass (5/5). This is a geometric regression test, not a new visual scenario approval. A blocked search retains the earlier unresolved-contact behavior; it does not authorize crossing a static barrier.

## Separation continuity

The optional diagnostic now records visible hip positions. `peer-continuity-status.json` and its summary exposed a 2.862 m reversal over 0.116 s when a baked correction disappeared during rolling. The contact offset is now retained across subsequent fall samples and after peers leave. It is reset exactly at the fall-to-get-up handoff, where the corrected fallen pose and logical root already include that displacement, avoiding double application. Recovery commits its remaining offset through the existing reconciliation.

`peer-held-offset-status.json`: completed four-actor run, zero errors/final down actors and zero baked vertices detected inside physical colliders. Maximum sampled hip step is 0.470 m over 0.183 s during the launch; maximum among the displayed recovery outliers is 0.410 m over 0.150 s. This removes the large observed reversal in this run but does not certify frame-by-frame smoothness, all crowd layouts or timing-independent equality. All 22 combat physics tests passed. A new continuous visual capture remains pending.

### Playback without peer diagnostics

`peer-normal.webm` and `peer-normal-status.json` repeat four impacts without peerContacts=1. The optional per-vertex/collider and hip logging is absent. Existing fixture support sampling and recording overhead remain, so this is not a performance benchmark. The run completes with no errors or remaining down actors. `peer-normal-contact.png` samples the first 18 seconds at 3 Hz and shows the fall/get-up sequence without the earlier large reversal in those samples. It does not constitute full-frame playback review.

A new catalog-hyena regression in baked-solid-contacts.test.js verifies that peer removal preserves the correction across repeated restored poses without accumulating it. All three tests in that file pass; the production build also passes. Remaining crowd layouts, species and continuous visual acceptance are still open.

## Four-rhino coverage

`rhino-group.webm` (25.253 s) repeats the four-impact UI recorder with the installed rhino profile, without peerContacts diagnostics. `rhino-group-status.json` reports completed simulation, peak 3 physical / 1 baked, finalDownCount 0 and errors []. The first 18 seconds and final six seconds are sampled at 2 Hz in separate contact sheets. The reviewed ending shows all four upright and resuming movement/attacks; several silhouettes overlap in perspective during the cycle. No mesh-containment or continuity measurement is inferred from this recording. It is a controlled QA scene with cooldown resets, not balance or performance acceptance.

### Rhino containment and motion diagnostic

`rhino-peer-status.json` and `rhino-peer-summary.json` contain a separate four-rhino run with peerContacts enabled. 157 sampled pairs, no physical/baked AABB candidates and no negative physical collider distance; completed cycle, zero errors/final down actors/bodies, maxVisibleGuardians 1. This supports separation for this run only.

The largest sampled baked hip step is 0.586 m over 0.133 s, decomposed into 0.246 m horizontal and -0.531 m vertical during recovery. It is not the earlier 2.86 m horizontal reversal, but the vertical transition still needs close visual review. Do not treat the containment result as artistic acceptance.

Reproduce summaries with `python tools/guardian/analyze_peer_trial.py INPUT --output OUTPUT`. The script preserves limitations and separates horizontal/vertical motion; diagnostics remain unsuitable for performance comparison.

### Close baked-rhino entry capture

The QA-only bakedClose=1 option frames the first overflow actor once without changing the game camera. `rhino-close.webm/status.json` and the 17–21 s detail sheet document the trial. Other rhinos occlude the subject, so this close shot does not certify the transition. New optional fields record recoveryAge, lift and entryClearance.

During the final roll, baked ground lift rises from 0.410 to 1.237 m while the retained horizontal separation reaches approximately (-2.589,-0.858) m. Entry clearance is 0.01 m. Over recovery ages 0–0.65 s the hip moves from y=14.390 to y=13.340. This narrows investigation to final baked pose/ground-support correction and its entry blend; it does not yet identify a proven root cause or justify simply slowing the clip. The issue remains open.

## Baked rotation alias correction

Corrected quaternion interpolation in BakedBeastFall: using the destination as the second slerpQuaternions operand overwrote the baked target with the initial pose. The fallback previously followed the hip trajectory without reproducing articulated rotations. A new regression compares all fourteen bone world rotations against independently interpolated clip samples for all five species, including entry blend and final pose.

The focused fall/combat run passed 26 tests and failed two existing wall-continuity tests; this is not an all-green acceptance. A separate 60 Hz full-skin wall diagnostic reveals buffalo penetration of 0.02205 m. Rhino passes skin separation at that cadence, with maximum hip step 0.07961 m. The old 0.1-second continuity threshold also fails after genuine articulation is restored. Do not simply weaken it: collision coverage and continuity remain open.

Actual four-rhino runtime evidence: rhino-quaternion.webm, rhino-quaternion-status.json and sampled rhino-quaternion-entry.png. Reviewed the contact sheet: fallen poses are visible but foreground animals occlude parts of the sequence, so this does not certify all joints or recovery transitions. The recorded baked terminal ground lift is about 0.156 m instead of 1.237 m before this correction. This fixes a concrete playback defect; it does not establish complete visual acceptance or performance parity.

### Full-skin buffalo regression isolated

Added tests/baked-wall-skin-regression.test.js to preserve the actual defect independently of the old coarse continuity assertion. It replays the real catalog buffalo side clip at 60 Hz through 2.02 seconds and checks every non-tail skin vertex. It currently fails at 2.0166667 s: Mesh_0 vertex 31409 enters the wall by 0.0220494 m despite a -0.1844032 m contact correction. That vertex is absent from the sparse contact samples. This confirms incomplete sampled-envelope coverage rather than merely a disputed displacement threshold. The test is intentionally red pending a collision-envelope correction; runtime performance of the eventual correction must also be measured.

### Rejected exact-vertex scan (CPU budget)

An experimental full non-tail vertex envelope passes the 60 Hz buffalo wall regression (plus all three rotation tests). It scans 51,598 buffalo / 46,518 rhino vertices each contact update. The ABBA Node microbenchmark in full-skin-cpu.json measures resolve alone: buffalo 11.63–11.95 ms mean versus 0.33–0.35 ms sampled; rhino 10.82–11.00 ms versus 0.47 ms. This overhead is unacceptable for the intended runtime. The production change was reverted, so the penetration regression remains open. This is neither a browser FPS comparison nor a completed fix.

rejected-full-skin.patch preserves the experiment; apply only in an isolated checkout before running tools/guardian/benchmark-baked-contacts.mjs. The benchmark refuses to run without that experimental implementation. Next implementation must retain coverage without skinning tens of thousands of vertices on every active contact update (for example, conservative bounds derived from skin influences with exact refinement only where necessary). No performance acceptance is claimed.

### Matrix-prepared full skin envelope

Implemented SkinContactBounds, preparing each skin matrix once per pose and evaluating vertex positions directly, including relative/absolute active position morphs. Used for baked static-solid bounds; ground samples and peer-only paths retain their prior behavior. The full-skin buffalo wall regression now passes. Five catalog-species equivalence tests compare bounds against Three.js vertex deformation with translated/rotated/scaled roots, articulated bones and active morphs (1e-6 tolerance), all pass.

matrix-skin-cpu.json records the updated ABBA resolve-only microbenchmark. It is materially cheaper than repeated Three.js per-vertex calls, but still exceeds the sparse baseline; browser frame cost, initialization overhead and visual continuity are NOT accepted yet. The older 0.1-second displacement assertions remain unresolved. This change fixes the observed missed-vertex collision without declaring the broader collision/performance work complete.

### Exact deformation deduplication

Removed duplicate contact vertices only when position, four skin indices/weights and every position morph attribute are exactly equal. UV/normal seams do not need repeated skin deformation for an envelope. Equivalence tests still pass for all five catalog species with active morphs and articulated/transformed roots. Unique counts are 11,623 buffalo and 11,574 rhino. unique-skin-cpu.json measures approximately 1.10–1.12 ms / 1.35–1.38 ms mean resolve cost respectively. This remains a Node microbenchmark, not graphical/performance acceptance. Construction currently builds the unique list per contact controller; caching/prewarming and browser validation remain pending.

A packed attribute-array experiment was also measured (packed-skin-cpu.json) and reverted: no demonstrated gain, extra memory. Only exact deduplication remains active. Earlier CPU receipts bind earlier implementations.

### Prewarm and reuse contact indices

Contact index lists are now cached by geometry and skeleton ancestry, with invalidation for replaced/updated position, skin, morph and tail-mask attributes. BeastCombatPhysics.create prepares the lists alongside existing recovery warmup before input-triggered hits. Controllers retain their own mutable matrices. Tests cover reuse and invalidation; six bounds/cache tests pass and the 22 focused combat lifecycle tests pass. This removes repeated string/dedup work for shared immutable geometry; actual scene cloning/cache reuse and cold loading cost still require runtime measurement.

### Runtime wall recording after prewarm

buffalo-cache-wall.webm/status.json records the actual day WorldScene wall trial: completedSimulation true, finalDownCount 0, errors empty. Sampled one-second frames reviewed in buffalo-cache-wall.png show launch, downed pose and return to standing. The animal is too dark/small for fine joint/contact acceptance. This single-actor run uses physical ragdoll, not baked overflow, so it is NOT validation of the full-skin baked wall correction. A closer baked-specific graphical trial remains required.

### Baked-specific wall concurrency fixture

Added optional bakedWall query mode to the diagnostic page: three separated animals consume the physical slots before the original wall-side animal is hit, forcing one genuine baked fallback. Camera follows its pelvis only in this QA mode; production camera unchanged. Recorded buffalo-baked-wall (initial fixed view, partly occluded) and buffalo-baked-follow (revised following view). Both report four impacts, peak 3 physical / 1 baked, completed simulation, errors empty. Reviewed sampled sheets: downed pose and recovery are visible, but dark dorsal shading and foreground clipping/other animals still prevent fine visual acceptance. These limitations must be corrected before calling the scene approved. The reports are diagnostic, not performance comparisons; one-second sheets cannot prove continuous contact separation.

### Dark buffalo shading isolation

Inspected catalog GLB materials (body metallic 0, roughness .5) and extracted albedo: authored dark fur contains tonal variation. Main/body, oral and lid normals contain no zero/nonfinite entries in the static geometry audit. Compared actual same-fixture runs with beastLighting=legacy and current beast shader. Reviewed sheets: legacy shows dorsal facets/detail absent from the near-black current rendering. This narrows investigation to shader behavior but does not prove one expression is responsible.

Tested replacing the current subtractive contrast clamp with a smooth power curve (rejected-fur-curve.patch). buffalo-fur-curve recording still shows the black dorsal region; hypothesis not confirmed, change REVERTED. buffalo-legacy-light and buffalo-fur-curve status files report completed cycles and no logged errors. Neither is visual acceptance; motion timing differs and footage has framing limitations. Original textures/materials remain unchanged. Next isolate custom beast-light terms rather than globally brightening the scene.

### Isolated color and optional sheen study

Added explicit beastLighting diagnostic query modes: albedo, key, fill and sheen. Default remains style 1, legacy remains style 0; the proposed sheen is NOT enabled in normal play. Albedo isolation still shows near-black dorsal fur, correcting the earlier overly narrow attribution to contrast alone. Legacy highlights contribute geometric readability that the current matte shader suppresses. Static normals audit found no zero/nonfinite normals in any of the buffalo's three meshes.

buffalo-albedo-isolation.png and buffalo-sheen-trial.png are actual browser screenshots reviewed at the same fixture camera. The small broad sheen trial gives limited dorsal detail at this distance, but is not artistically approved: poses differ and closer/back-angle, night and other-species checks are needed. No texture edits or global lights were introduced. Source syntax checks pass; browser reports errors empty. Continue investigating the appropriate matte fur response before selecting a default.

### Fixed-pose dorsal comparison: sheen rejected for adoption

Added QA-only fixed dorsal camera and direct current/legacy/sheen plus day/night controls; this avoids comparing moving poses or changing the camera between shader variants. Reviewed buffalo-fixed-day-current, buffalo-fixed-day-sheen and buffalo-fixed-night-sheen at close range. Proposed sheen exposes broad triangular facets across the mane; it is REJECTED for default adoption. It remains an explicit diagnostic mode only. Current/default shader is unchanged. Saved night-current baseline as well. Investigate the surface-normal field separately from dark albedo before altering materials; do not call this a successful fur fix. Production camera/controls are unchanged.

### Surface normal isolation succeeds on the diagnostic copy

Added reversible normal-map scale and cloned-geometry smooth-normal study controls. With map disabled, dorsal facets remain; area-weighted normals shared across coincident positions remove the broad facets. Re-enabling the original normal map retains the smoother appearance. Reviewed buffalo-smooth-no-map.png and buffalo-smooth-original-map.png in actual browser; body silhouette/texture remain. This identifies a viable direction, not a production asset acceptance: whole-body smoothing is a diagnostic and sharp authored details/face/morph shading still need review before localized source authoring.

The regression verifies index/position/UV/skin and all morph attribute arrays unchanged, only normal attribute changed, and exact original geometry restored. Runtime catalog/source Blend remain unchanged. The sheen remains opt-in. Next transfer a suitably bounded normal correction to editable source and review neutral/animated/front/side views before registration.

### Editable localized mane study

Created test-results/buffalo-mane-normals.blend using study_buffalo_mane_normals.py from the preserved editable source. The smooth mask limits normal blending to the rear mane, fading by rear coordinate, height and lateral extent; 3,887 corners affected. audit_actor_normal_edit.py reopens both files and proves identical positions, polygon indices, UVs, skin weights and every shape-key coordinate for all four source meshes. Audit receipt and source SHA are saved here. The output is reproducible and remains an isolated local study, not a registered asset.

Export correspondence is NOT established: editable mesh bounds and active GLB accessor bounds differ, so a naive coordinate-mask binary patch would be unsafe. Next export/inspect the source transformations and verify geometry/animation correspondence before writing final normals into the runtime GLB. Do not infer export parity from the source-array audit. Original catalog/source files are unchanged.

### Export correspondence resolved and runtime candidate inspected

Exported original and edited Blend with identical settings using export_buffalo_normal_study.py. Original export matches the active GLB body attribute/index arrays exactly; coordinate differences are exporter skin/rest transforms, not mismatched source. Edited export merges some normal-equivalent vertices (47,886 -> 47,599), so transfer_authored_normals.py maps verified equal triangle corners back to the original topology. All non-normal corner attributes and position morphs match. Sparse normal morph records require repacking one accessor; original non-normal binary payloads remain byte-exact. Candidate receipt: buffalo-mane-transfer.json.

Loaded test-results/buffalo-mane-candidate.glb in real WorldScene using face=buffalo&maneTrial=1&beastLighting=sheen. Reviewed buffalo-mane-export-day.png: broad mane facets reduced; arms retain original facets because the mask is localized. Errors empty. Static dorsal candidate only: no production registration, compression, night/motion/full-face acceptance yet. Existing textures (full-resolution original), animation payloads, skin, topology and morph position payloads are retained instead of exporting the portable source's smaller textures. The proposed sheen remains explicitly opt-in.

### Compressed candidate and nocturnal lifecycle

Compressed the transferred candidate from 77,803,860 to 6,126,224 bytes with existing Meshopt/WebP pipeline. verify_web_assets --candidate passes exact decoded geometry/animation bytes, texture checks (minimum PSNR 40.13 dB), and glTF conformance with zero errors. Receipts saved as buffalo-mane-web-compression/verification.json. The maneTrial override now loads this compressed candidate.

Actual nocturnal four-impact wall trial completed with finalDownCount 0 and errors empty; buffalo-mane-web-night.webm/status.json saved. Reviewed one-second contact sheet: launch, downed state and recovery are present, but dark fur and near-frame clipping still limit detailed motion acceptance. This run uses the explicit experimental sheen mode; it does not certify default lighting or GPU performance. Source/catalog remain unchanged pending remaining face/pose/normal acceptance and final packaging.


## Registered rear-mane revision

Installed normal-only source 9dc6ecb1236bc79566fa2862c4624ad34d9111a4286b59220393c08a14076090; original expressive source and pre-edit portable Blend preserved. Runtime compressed geometry/animation verification passes (4,479,590 exact decoded bytes; texture PSNR minimum 40.13; zero validator errors). All 29 focused combat-physics, full-skin wall and skin-bound tests pass against the updated catalog. This does not close the two previously documented coarse wall-continuity failures.

Actual WorldScene load without candidate overrides exposed an incorrect catalog rewrite that dropped the generated crop entry. Restored the complete production models catalog and replaced only the buffalo URL. Repeated load succeeds with crops and buffalo, no reported errors. Saved installed-default screenshot/status. Default beast lighting still renders the dark dorsal region with poor detail; normal smoothing is not a completed lighting fix. Experimental sheen remains disabled by default. Six original clips and facial neutral/pain combinations were inspected separately in the expression fixture. No broad performance or all-angle visual acceptance is claimed.


## Wall-contact temporal refinement

The old 15 cm per 100 ms assertion conflated articulated fall speed with a position discontinuity. Sampling at 60/120/240 Hz revealed a real smaller discontinuity: separation added 15 mm on top of an already expanded 15 mm envelope. Removed the second margin, retaining the expanded envelope and a numerical epsilon. Added temporal-refinement regression: maximum per-step displacement must shrink on each halving of dt; 120 Hz maximum remains below 5 cm. Both species pass, as do complete-mesh wall checks and the 60 Hz buffalo regression (six tests total). The former two coarse continuity failures are superseded by this measured test, not silently suppressed.

Recorded production-catalog daylight WorldScene four-hit wall scenario after the fix. Errors empty; maximum visible Guardians is one. Contact sheet inspected: launch, falls and subsequent rises visible. Wide shot keeps most bodies framed but the wall-side actor is small and partly obscured; this does not establish millimetric contact or every-frame clearance. Default dark fur remains poorly readable. This is not a paired performance measurement. Evidence: buffalo-wall-contact-refinement.webm/.png/.json.


## Recovery CPU attribution

`node tools/benchmark-guardian-recovery.mjs` exercises the registered buffalo/rhino models and authored stand-up clips, flat surface, with/without a fixed wall. One warmup traversal plus three measured traversals (120 poses each), instrumented cloth/contact/full-skin-envelope calls. Result: recovery-cpu-breakdown.json. Total includes restore; solid time includes envelope (do not add nested timings). Buffalo wall mean 1.60 ms / p95 2.22 ms; rhino wall mean 3.28 ms / p95 4.88 ms in this run. Full-skin envelope means .81/1.00 ms respectively. Cloth is absent for buffalo and .24 ms mean for rhino with wall.

This isolates authored recovery cost, not browser FPS, live terrain query cost, actual physical-entry poses, or a before/after improvement. Scenario order is fixed, so small inter-scenario differences may include warmup/order effects. No reduction in collision accuracy or production algorithm change is made on this evidence. Both simulation collider-follow and rendering currently evaluate recovery; reuse would need explicit validation of root transforms, morph-dependent contacts and changing obstacles. General engine performance remains out of scope for this investigation.


## Summon framing after camera changes

Day/night spell recordings using the production catalog exposed a cropped day arrival immediately after an orbit. Added camera world-matrix refresh before placement projection; the same-frame-turn regression fails without that refresh and passes with it. That fix alone still leaves the vortex cropped (spells-day-camera-fixed). Scoring now includes eight corners of a conservative body/vortex envelope, for both normal and elevated candidates. The repeated day segment at 7�11 seconds places the full Guardian and vortex inside the view while preserving the crop and hand-fed beam. Eleven placement tests plus 24 singleton/lifecycle/prop/combat tests pass.

Recordings labelled current predate these fixes; camera-fixed contains only the first fix; framing-fixed includes both. Day framing-fixed is 22.31 seconds, VP8 with no audio track (audio context reset between iterations); original day/night captures include their separately enabled audio session. No perceptual audio acceptance is claimed. Contact sheets inspect sampled stages, not every video frame. These controlled scenarios do not cover every terrain, camera, obstacle or wind/fabric condition.

Final night repeat (spells-night-framing-fixed) includes VP8/Opus. Inspected 1 Hz contact sheet through 20 seconds: Attack hand beam, visible reaction, cyan Shield, camera orbit/zoom, repeated casts and disappearance. Day and night final statuses report errors=[], maxVisibleGuardians=1, active=0 and no retained attacks. Night remains dark and these sampled frames do not certify continuous cloth quality, exact impact synchrony or audio mix.


## Close wind review

Added a 12-second canvas recording control and an inspection-only vortex visibility toggle to guardian-3d.html. Uses the existing local receive_video.py endpoint /idle.webm; output must be copied before another recording overwrites it. Recorder stops its media tracks and releases the UI guard on success/failure. No production wind parameters or game vortex behavior changed.

Recorded the installed GLB in actual Three.js: Idle + Float + Mantle_Breeze from three-quarter view with vortex, and Idle + Float + Mantle_Spell from side view with vortex hidden. Both videos are silent, twelve-second cycles. Reviewed 1 Hz contact sheets: broad hem deployment and independent ornament movement are visible, with the shoulder area attached. The side view makes the mantle range substantially easier to judge. No obvious stretched geometry in these sampled images; no claim of continuous collision or artistic acceptance from sparse samples. This studio fixture does not replace WorldScene validation.

All five guardian-model tests pass, including exported loop endpoints/velocities, broad hem rotation, pinned shoulder range and separate secondary channels. Those bounds validate the animation data rather than perceived fabric realism. Browser script syntax check passes. Evidence: guardian-wind-close-idle and guardian-wind-close-spell videos/contact sheets; status JSON records the lateral spell setup.


## Real terrain slope recovery

Expanded authored-recovery-terrain.test.js to all five production-catalog beasts, three planar slopes/yaws and three supported supine samples. Each left/right foot is now measured separately; checking their combined minimum could conceal one floating foot. World-space snapshots are recaptured after each yaw. All five tests pass: individual foot minimum <5 cm, full non-tail mesh penetration bounded at 2.5 cm, non-hip bone lengths unchanged. This is sampled authored-pose evidence, not an entire physical fall or a general terrain guarantee.

Added opt-in `slopeTrial=1` to the combat fixture. It searches existing terrain near the village for a valid footprint with grade 12�30%, preferring 18%; it never modifies terrain. Selected site 109.5/-14 has gradient (-.17499,.04105), magnitude .17974. `guardian-combat.html?recoveryDay=1&slopeTrial=1`, rhino, lateral impact, recorded selected cycle: completedSimulation=true, peakActive=1, peakBaked=0, finalDownCount=0, errors empty. Reviewed contact sheet: impulse, descent, roll and rise occur on actual terrain. Vegetation hides some foot contacts; do not claim continuous contact or all-frame penetration acceptance. Video is a controlled single-species daytime trial, not the full slope/concurrency matrix. Evidence rhino-slope-side.webm/.png/.json.


## Diffuse dark-fur diagnostic

Fetched origin/main before further work: zero commits missing from this branch at the time of check. Added optional beastLighting=soft (style 6), a diffuse dark-albedo contribution without the power-8 sheen lobe. Default remains style 1. Low-strength .018/.019/.021 trial improved detail only slightly; .04/.039/.037 makes the dorsal strands easier to read in day/night, but also accentuates the untouched arm facets. Saved low/day/night screenshots and actual runtime status. This is not an accepted production material or a performance comparison. Do not enable globally from these buffalo-only views. The next material decision needs surface continuity outside the localized rear-mane normal edit, rather than further unbounded brightness increases. No lights or texture resources were added.
