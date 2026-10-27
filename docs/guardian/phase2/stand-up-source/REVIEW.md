# Supplied get-up clip: first retarget and engine trial

The unchanged user-supplied `Stand_Up1` is preserved under `content/source/animations/stand-up/`. The current hyena candidate transfers its 8.2667-second motion onto the existing expressive model; it does not replace the model, textures, facial morphs or native animations.

## Reproduce

```powershell
node tools/guardian/retarget_stand_up.mjs content/source/animations/stand-up/source.glb content/source/actors/hyena/expressive-candidate.glb content/source/animations/stand-up/hyena-candidate.json
node --test tests/authored-stand-up.test.js tests/beast-combat-physics.test.js tests/beast-ragdoll.test.js tests/baked-beast-fall.test.js tests/baked-ragdoll-clip.test.js tests/actor-expression.test.js
```

Preview `/tests/browser/stand-up-source.html?candidate=hyena`. Engine trial: `/tests/browser/guardian-combat.html?authoredRecovery=1`, select hyena, lateral recovery view, then record selected cycle. This option explicitly installs the candidate in the physical manager only for the fixture. The game default and baked overflow recovery have not been switched.

## Implemented and verified

- Bind-space rotation transfer, target limb lengths, arm/leg direction calibration and offline wrist support adjustment. A naive transfer required up to 0.375 m of whole-body correction when a long target arm passed below the floor. Bending the elbow to reach the support plane reduces the maximum offline correction to 0.181 m. These are bake diagnostics, not runtime acceptance metrics.
- 497 samples at 60 Hz, 21 target bones and 22 channels. Only hips translate. Uncompressed authoring JSON is about 1.07 MB; shipping encoding is pending.
- Source ankle motion is calibrated against its standing endpoint rather than assuming equivalent bind axes.
- Runtime candidate samples the authored motion over 3.1 seconds, with 0.65-second entry and 0.3-second exit. Durations are constructor options. Existing colliders remain kinematic during recovery; navigation ownership is released normally.
- A repeat-hit regression exposed loss of intermediate spine/shoulder pose when native animation resumed during ragdoll transfer. The physical binding now retains captured passive-joint poses and restores native poses when it relinquishes ownership.
- **35 tests pass**, including full skin floor checks on sampled frames, unchanged limb lengths, continuous hips, actual solver recovery, repeated hits at four authored recovery ages, existing five-species physical tests, baked fallback and facial controllers. These tests do not prove artistic quality or obstacle-safe get-up.

## Real graphical evidence and remaining defects

[Recorded engine cycle](hyena-runtime.mp4), [contact sheet](hyena-runtime.png), [visible runtime report](hyena-runtime.json). The sheet starts at video second 3 and samples at 2 fps. Source preview evidence: [original at 4 seconds](source-side-4s.png).

The engine run completes falling → recovering → walking/attacking, reports no errors, zero final physical bodies, no retained down state and at most one Guardian. The current expressive hyena is loaded through the normal catalogue. Audio was not activated; this run does not validate sound.

**Initial version rejected at entry:** interpolating directly from the lateral physical fall into the authored supine start lifted and rolled the body too conspicuously. The original trace records up to 0.273 m additional ground correction during the entry. The original sheet visibly shows the body rising before the seated support phase. This evidence is retained; the physical-roll revision below replaces that direct transition.

Diagnostic recorded frame p95/p99: 66.6/66.7 ms; physical-manager p95: 3.7 ms; recovery rendering p95: 2.0 ms; recovery collider follow p95: 2.8 ms. This single recording with other review tabs available is **not** a paired performance comparison or evidence attributing existing fluency issues to this change. No general engine performance investigation was undertaken.

Pending: refine remaining entry drift and terrain support, adapt all other beasts and worker rigs, validate slopes/structures/repeated live hits, incorporate authored recovery into the bounded baked fallback, optimize/package shipping clip data and enable production only after those gates. No claim of final recovery completion.

## Physical roll before the authored get-up

Following the user's request, the actor now enters `rolling` after settling. It remains a dynamic articulated ragdoll with the same 14 rigid bodies, 13 constraints and collision world. Bounded angular impulses turn the fallen configuration towards the supplied clip's supine hip orientation. No body translation or rotation is assigned directly. A weight/lever-arm torque helps the convex body tip over its support edge; angular feedback damps the turn. The intended standing heading follows the fallen longitudinal axis, avoiding a head-over-heels rotation just to recover the pre-hit heading.

`RAGDOLL_ROLL` centralizes speed (2 rad/s), response (24), acceleration cap (80 rad/s²), support coefficient (1.8), orientation tolerance (0.45 rad, approximately 26°), stable interval (0.15 s) and maximum attempt (3 s). Orientation tolerance allows a curved collider to rest on the terrain without demanding the exact airborne clip quaternion. Both torso bodies must be slow (under 0.65 rad/s) before transfer. The residual pose difference is blended into the authored clip. If the turn cannot complete, `rollFailures`/`lastRoll.timedOut` report it explicitly and the existing procedural recovery prevents an indefinite AI lock; this is a limitation, not a successful authored recovery.

Another hit cancels roll control and reuses the current dynamic pose/world. The manager refreshes the AI watchdog while it owns the animal, so longer roll/get-up sequences cannot resume attacks or navigation prematurely.

**Verification:** 36 targeted tests passed after adding the turn, including three initial impact directions and interruption during rolling. Following the AI-watchdog and solver cancellation fix, all 10 combat-physics tests were rerun and passed. Existing pose/penetration tolerances remain unchanged. The authored repeat-hit test waits longer because it now includes the explicit physical turn; procedural deadlines remain unchanged.

[Diurnal close recording](hyena-roll-runtime.mp4), [close sheet](hyena-roll-runtime.png), [matching runtime report](hyena-roll-runtime.json), [wider recording](hyena-roll-wide.mp4), [wider sheet](hyena-roll-wide.png). Both recordings use the real game fixture. The close run reports a 0.983 s dynamic turn, final orientation error 0.217 rad, no roll timeout, no errors, zero retained bodies/down states and one Guardian maximum. Its subsequent authored correction peaks at 0.145 m. This is a different initial fall and terrain placement from the earlier recording, **not a controlled improvement percentage**. The wide recording preserves the complete body during the turn and stand; the close framing clips part of the model and is useful only for visible torso detail.

The sheets were inspected: side-to-back turning and the subsequent seated/standing sequence are visible. Minor settling motion, contact offsets and entry drift still need refinement, especially on uneven terrain. These runs do not approve other species, obstacle-adjacent turns or audio. The wide run was followed by a code-only AI ownership fix; its visual path is unchanged. Production loading remains gated behind the explicit authored-recovery fixture option.

## Reusable authoring lessons

Names identify likely corresponding joints; they do not establish equivalent rest axes, topology or lengths. Keep the target bind skeleton and mesh. Compare source and retarget at the same time from side and front. Inspect ground-contact failures by the actual limiting skin vertex and influencing bone. Fix overlong-arm support with elbow articulation before lifting the whole body. Validate interrupted transitions as well as clean playback: omitted intermediate joints can cause jumps even when all simulated rigid bodies are continuous. Always retain failed visual evidence and distinguish a numerical pass from artistic acceptance.
