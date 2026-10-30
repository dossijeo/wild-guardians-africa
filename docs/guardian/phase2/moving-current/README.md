> Correction (2026-10-30): the night-31 campaign fixture uses legacy-js navigation/world loading. Its saved state has no wildEngineWorldVersion, and the campaign branch bypasses prepareWildEngineWorld. Earlier descriptions of campaign-derived runs here as native are incorrect. Their measurements and outcome equality remain historical legacy-engine evidence only; they do not validate Wild Engine performance. Non-campaign lightingReview runs explicitly reporting spatial-wasm are unaffected. A compatible native populated-world comparison remains required.

# Moving-scene component comparison

Restored the same night-31 snapshot in separate tabs, closing each previous WebGL tab. Used guardian-combat.html?campaign=1&navigation=reference, then navigation=guardian, and clicked Medir navegacion real. Each executes 400 fixed .05-second Game.tick steps with real navigation, four initial animals and two legal Attack commands at .55 and 12.65 simulation seconds. Reference retains combat physics and suppresses Guardian presentation. Zero hidden frames/errors. Final simulation outcomes are exactly identical, including animal/worker/structure state and RNG.

See comparison.json for values. Guardian animation P95 .285 ms, VFX P95 1.675 ms, draw P95 189 versus 180. Frame P95 199.445 ms versus 149.675 ms; P99 282.685 versus 149.83 ms. Render P95 37.045 versus 33.245 ms. Average FPS 9.36 versus 10.50. This is one sequential pair, without counterbalanced repetitions or thermal/OS controls; do not attribute the entire difference to Guardian or declare performance acceptable. Fixed simulation stepping is useful for outcome parity, not proof of real-time control responsiveness. Baseline issues remain assigned to another agent; next work should isolate the new VFX component and repeat balanced comparisons, not refactor general navigation.

## Component timing

Added vfxUpdateMs, vfxPrepareMs and auraAdvanceMs counters to GuardianSummons and corresponding P95 fields to the moving QA report. A fresh 400-frame Guardian run (components.json) measures update .030 ms, prepare 1.685 ms and aura advance .015 ms at P95, errors empty. Prepare includes packing sprites, rigid/streamed geometry, buffers and camera uniforms, so this identifies the expensive stage, not yet the exact subroutine. No optimization or speedup is claimed. Ten singleton/retained-projectile tests pass after instrumentation.

## Scalar ribbon packing

Replaced the per-triangle vertex array/entries iterator and spread packing with a three-iteration scalar write in the generated VFX geometry path; updated the source generator and generated-module hash. No tessellation, opacity, timing, shaders or vertex values changed. All nine VFX tests pass, including exact original-source parity for 18 compositions at ten sample times (geometry, particles, tools, lights and packed sprites).

Fresh moving-scene run scalar-pack.json completes 400 frames without errors and with the same final outcome as components.json. Preparation P95 observed 1.125 ms versus 1.685 ms before. This is a single sequential comparison (about 33% lower observed stage time), not proof of an overall FPS gain or stable hardware-wide improvement; balanced repetitions and visual runtime review remain necessary.
