# WebGPU admission: scene and lighting identity

## Finding

In a saved savanna night raid, the instrumented Three.js r180 node cache reported 57 draw-time builds for animal materials that had previously been prepared for the same object and material. The admission used a different scene and a different `LightsNode` from the actual draw. Supplying the real scene alone was insufficient: although both lists contained the same six lights, their node identities differed and contributed to the dynamic cache key.

The experiment temporarily uses the real scene and its light-node identity during the synchronous setup of `compileAsync`, and restores the original render-list ownership and light array before awaiting the compilation. A candidate group containing visible, camera-layer lights, a non-scene target, or an unsupported renderer uses the previous path. Reentrant ownership changes are rejected rather than overwritten. This uses private Three r180 APIs and the repository's Three WebGPU patch; it must be revalidated when upgrading Three.

The implementation is **opt-in** via `VITE_WEBGPU_ADMISSION_SHARED_LIGHTS=true`; the default production behavior remains unchanged. It is not yet approved for general use: fog, environment and light changes, other biomes, day/night transitions, and visual equivalence require further validation. It does not address all remaining draw, upload, or simulation costs.

## Observations

The QA cache-miss probe adds work and its timings are not clean benchmark measurements. With the probe, the baseline had 28 draw-time cache misses for `Mane repairs`, `Material_0`, `Warthog oral tissue`, and `Actor eyelid original fur` after the first inspection, totalling about 1482 ms inside the instrumented calls. The integrated opt-in run had zero such misses in its corresponding observed interval. The runs are not frame-for-frame identical and do not establish an end-to-end speedup.

The integrated run reported real WebGPU on an NVIDIA Turing adapter, eight visible animals and eight visible grass tiles, with no reported resource errors. Main-thread rAF mean/p95/p99/max were 37.13/66.68/66.79/100.05 ms; the final simulation-to-presentation lag was 5.75 s. These are not GPU timings. A 10 s requested window lasted 11.42 s because inspections were themselves delayed.

An earlier uninstrumented A/B/B/A comparison used a QA source override, not the final guarded implementation. Graphic-worker callback interval means were 391.5 and 412.0 ms in the controls versus 290.8 and 247.3 ms in the candidates; samples were sparse (25–41 callbacks) and the simulation states differed. Main-thread rAF p95 remained approximately 66.7 ms and final presentation lag remained 5.6–6.65 s. These numbers justify continued investigation, not a claim that the stutter is fixed or that the guarded implementation has proven an overall gain.

Paused captures under the QA override looked similar, but differed in 30,595 of 921,600 pixels and did not have the same presentation sequence. They are insufficient to establish visual parity. Raw captured data for the baseline, integrated run and the four uninstrumented comparisons is in `admission-lighting-20261108/`.

## Reproduction

Start Vite with `VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`, `VITE_WEBGPU_TEMPORAL_GRASS=true`, and optionally `VITE_WEBGPU_ADMISSION_SHARED_LIGHTS=true`. Run `tools/experiments/measure_webgpu_native_horde.mjs` with `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_REQUIRE_VISIBLE_GRASS=1`, and `QA_NODE_BUILD_DIAGNOSTICS=1`; `QA_OUT_FILE` selects the JSONL output. The script requires Playwright and a WebGPU-capable Edge installation. Do not compare instrumented timings directly with uninstrumented runs.

Run focused checks with `node --test tests/webgpu-admission-scene.test.js tests/webgpu-pipeline-admission.test.js tests/admission-scene-reference.test.js tests/node-builder-diagnostics.test.js`. Before enabling by default, compare identical visual states across representative lighting and scene changes, and repeat end-to-end measurements of the integrated implementation without diagnostic instrumentation.
