# Bounded logical prewarm pilot — not accepted

Source e4c8d77, main base e14695a. All flags remain opt-in, normal gameplay OFF.

At 139.10 m on incoming Acacia paraguas 0:-2:10, a prepared owned bank enables the true 120–160 m crossfade before its physical chunk arrives. Previous no-prewarm run only acquired proof around 95 m. A complete orbital route retained the target with zero target readiness drops and identical logical state. Mixed day/night approach changed the QA clock deliberately; its unchanged=false is preserved. Motion frame counters include paused holding time and are not performance samples.

Four bank estimates at the approach end total 7,738,872 bytes (7.38 MiB), excluding shared source resources and driver overhead. Four active atlas pairs estimate 44.74 MiB plus backdrop 5.59 MiB. WebP file bytes do not measure GPU memory.

## Negative performance result

Native/far/far/native, 45 warmup plus 120 samples each, viewport 1280×720, framebuffer 1600×900, medium Sabana/Mapungubwe, fixed camera [-19.41335805915263,17.708935170127262,279.44091999776685]. GPU p50: 32.956718 / 34.465520 / 33.175572 / 31.477082 ms; p95: 36.689531 / 38.153645 / 38.003644 / 34.154166 ms. Native endpoints drift -4.49%. Calls 72→82, triangles 1,453,497→1,586,005. No saving demonstrated; candidate adds work.

480 valid GPU queries, no hidden/disjoint/context-loss/render/GL errors, state exact. Atlas/bank allocations remain resident while the owner is disabled, so this is not a memory comparison against a fresh native application. Root had no active GPU scene, build or benchmark during samples; three long CPU campaigns remained alive. CPU timing is not a clean-machine comparison or FPS promise.

## Global readiness counterexample

The target has zero drops, but the audit of other near trees records readiness descents during initial relocation. Several reported physical groups have frustum=false and no selected batches. This may include deliberately offscreen selection; it must be distinguished from visible gaps before acceptance. Raw diagnoses are retained in cost-states.json.gz. No global stability acceptance, no PR yet.

Next: avoid submitting zero-fade bank instances, repeat performance and classify global descents using actual visibility. All other species still require native-sun atlas regeneration and the full biome/motion/day/night validation.

## Tail exclusion repeat — 965a09a

Same fixed camera/configuration and 480 valid queries. Calls remain 72/82. Candidate triangles reduce from 1,586,005 in the prior revision to 1,505,798 (80,207 fewer); native stays 1,453,497. GPU p50 A/B/B/A: 32.605729 / 33.081613 / 34.085676 / 32.066927 ms; p95: 35.188176 / 36.039218 / 36.992916 / 35.101145 ms. A endpoints drift -1.65%. Candidate still adds local cost; no gain accepted. Zero GL/render/disjoint/hidden/context-loss errors and exact logical state. Packing/matrices stay immutable; only a zero-fade suffix is omitted by instance count. Interior zero-fade rows and offscreen instances can still be submitted.

All 44 original global descents have nonempty physical diagnostics with every native chunk bound outside the camera frustum. No drop in that report is classified potentially visible by those bounds. The unfiltered global counter and raw diagnoses remain archived; this classification does not prove all future paths or per-tree bounds.
