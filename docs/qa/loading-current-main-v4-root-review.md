# Current-main versus interactive loading: native ABBA

Root measured the real native Continue flow on 2026-10-09, in A1/B1/B2/A2 order. A is immutable main `d6c4adfc19f9cfc0db6f5d75fcbac4901f80ee6b`; B is feature runtime `41f57d037d79d4a2f5925b04bb77a2f926279e25`. Both contain the authored V4 crop assets. Private exports used identical read-only receipt instrumentation attached to the existing application RAF, without an extra loop, GPU queries, renderer wrappers or per-frame report serialization. Production defaults remained unchanged.

Each arm imported and verified the same day-one Sabana/Mapungubwe save through its BrowserSaveRepository, before timing. Snapshot SHA-256: `7bd6dbc14d0962b37931d21869c658a827a55a0c43f72c335c9af1481c4c0fdb`; slot `loading-v4-controlled-712`, seed `712`, zero crops. Timing starts at the trusted native iframe Continue click, includes real save loading and ends after camera restoration/final world draw. World readiness is measured separately from the feature's cinematic. Viewport: 1280×720. Cache retained and uncontrolled; no fully cached or cold-cache claim. Local CPU/GPU work was reserved during the four arms.

| Arm | Click to world ready | Click to controls | Ready to controls | Largest existing RAF interval | Intervals >50 / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 7863.3 ms | 7864.5 ms | 1.2 ms | 1197.2 ms | 8 / 4 |
| B1 | 12608.6 ms | 16632.4 ms | 4023.8 ms | 99.7 ms | 7 / 0 |
| B2 | 13350.7 ms | 17383.5 ms | 4032.8 ms | 99.7 ms | 4 / 0 |
| A2 | 7786.0 ms | 7787.2 ms | 1.2 ms | 1131.0 ms | 6 / 4 |

All four reports finished without errors, captured trusted clicks and the exact snapshot hash, and reached the normal HUD. Preparation of the feature diorama during the menu completed before the measured Continue click (B1 1878.4 ms; B2 1954.6 ms). This is separately disclosed work, not subtracted from measured loading or silently claimed free. All temporary tabs were closed and viewport override reset.

Readiness is slower by 4745.3 ms (60.35%) in AB and 5564.7 ms (71.47%) in BA. Both pairs exceed the declared rejection threshold of more than 5% and 500 ms. The requested cinematic explains roughly four additional seconds after readiness; it does not explain the readiness regression. Scheduling improves substantially, with largest observed intervals falling from over one second to about 100 ms. These are RAF scheduling measurements, not GPU frame timings or statistical equivalence. No physical peak RAM/VRAM conclusion follows.

The user accepts a practical compromise around 50–60 ms pauses and wants to avoid extending local loading. The next candidate must reduce redundant cooperative waits while preserving genuine resource readiness, shader warming, scene ownership and responsive rendering. Do not promote the current result as accepted, erase negative arms, shorten the cinematic to disguise readiness cost or rerun unchanged code until a favorable sample appears.

Raw reports, console logs and root summary are retained by the feature owner under `docs/qa/interactive-loading-development/current-main-v4-abba-root/`. The adjacent readiness protocol and private manifests disclose source inventories and hooks. An earlier incomplete private export omitted the statically imported GPU helper and failed before application startup; that negative pilot was retained, exact committed helper bytes were added to both exports, and HTTP module graphs passed before these arms. The trusted-click observer was corrected for the native iframe before timing. Neither correction changed production runtime.

Full feature CI `37914538279` at `f2adc0b2211165dad0bfbd4a3540ae6c5bc0ce68` passed 3681 tests, build and itch package checks. That audit-only commit preserves runtime `41f57d03`; CI success does not override this performance gate or establish completion of the remaining loading compatibility/lifecycle QA.

## Synchronous-budget exploratory pilot

Root subsequently tested frozen candidate `290722d9` at private origin 5412 with only the DEV `qa-loading-cpu-budget` flag. The same save hash, native Continue click, observer and 1280×720 viewport were used. No detailed loading spans, GPU timers, frameSlack or diorama-batch flag were enabled. The feature owner confirmed CPU/GPU quiet. This candidate accumulates synchronous submission work against a 16 ms budget and resets after an existing presentation RAF; program-readiness waiting does not itself consume that budget. Compiler/draw groups contain eight objects; depth retains groups of 32. Default production pacing is unchanged.

The pilot reached the HUD without errors: readiness 11270.0 ms, controls 15321.9 ms, 848 existing RAF intervals, maximum 99.8 ms, five intervals over 50 ms and zero over 100 ms. This is encouraging relative to the earlier feature observations but remains roughly 3.5 seconds above main readiness. It is one exploratory arm, not a new paired acceptance comparison or causal proof. Preserve it before choosing another targeted optimization. Raw report, console and ready screenshot are in the feature owner's `cpu-budget-candidate/root-pilot-290722d9/` directory. Tab 985 was closed; viewport reset; final browser inventory empty.

An 18-second observation wait was interrupted by the feature owner's completion notification after the measured native click; a second wait completed. The report uses intrinsic receipt timestamps, not that observation delay. The prior 55/56 injected-clock test failure was corrected by passing the same clock through the inner compiler; final 56 contracts, build and 326-module import preflight passed before this pilot. None of these checks establishes full production QA or removes the current-main regression gate.

## Attribution run: next optimization target

One additional native Continue run on frozen `290722d9` enabled detailed `qa-loading` spans alongside the CPU-budget flag. It retained default DOM-report throttling, the identical save, viewport and quiet reservation. Readiness was 10821.4 ms, controls 14869.7 ms, maximum existing RAF interval 116.4 ms (four over 50 ms, one over 100 ms); readiness and report closure succeeded without errors. Diagnostic serialization overhead is included, so this run is exploratory attribution, not another acceptance arm.

The largest awaited phase was `load-far-assets` at 3295.9 ms, followed by `load-warm-gpu` at 1452.0 ms. Nested GPU preparation phases were texture upload 532.1 ms, draws 315.5 ms, world compilation 233.9 ms, depth 137.5 ms and bindings 99.8 ms; crop construction was 240.2 ms. These awaited values overlap their parents and must not be added or treated as exclusive CPU/GPU cost. The largest observed synchronous world submit was 59.0 ms, and the first world draw 45.6 ms. Earlier diorama preparation occurred before the Continue click and included a 136.0 ms synchronous submission.

Three loading-frame update loops each yielded seven presentation RAFs. The first loop's measured stage work was 4.5, 7.7, 3.5, 31.2, 17.3, 3.3 and 0 ms; subsequent loops had much less total synchronous work. This supports investigating redundant barriers, but their wall-time saving cannot account for the entire far-resource phase. Source inspection also found per-species sequential day/night atlas loads and backdrop loading after adapter attachment. The next investigation should separate resource download/decode, adapter construction and upload readiness, and overlap independent resource preparation where ownership permits. Do not remove horizon readiness or promote a causal claim from this single run.

Detailed raw report, common observer report and console are retained under the feature owner's `cpu-budget-candidate/root-attribution-290722d9/`. Tab 986 was closed, viewport reset and browser inventory verified empty before releasing CPU/GPU quiet.

## Parallel far-image diagnostic pilot

Root measured private frozen candidate `212fd1feb0d4730976415c0c82e4c2becb582b56` on origin 5413, with detailed loading diagnostics and the CPU-budget flag, default report throttling, the identical imported save and 1280×720 viewport. The feature owner had confirmed no active CPU/GPU work. Independent atlas day/night images and backdrop were started together; adapter attachment and GPU readiness fences remained sequential and unchanged. Production defaults remain unchanged.

The native Continue pilot reached the HUD without errors: readiness 10256.6 ms, controls 14309.1 ms, 772 existing RAF intervals, maximum 116.4 ms, five over 50 ms and one over 100 ms. These are exploratory observations with diagnostics enabled, not paired evidence for accepting the main-readiness regression.

The new subspans distinguish the remaining delay: manifest 10.9 ms; nine day/night/backdrop image loads roughly 44.9–109.4 ms each, with the backdrop 78.7 ms. The first adapter attachment was 1949.0 ms; subsequent attachments were 329.1, 298.6 and 315.6 ms. The enclosing far-resource phase was 3017.4 ms. Image concurrency alone therefore does not resolve this phase. Awaited attachment includes regional worker generation, geometry construction, compilation, texture upload and successful GPU fences; these require further attribution before choosing an optimization. No exclusive CPU/GPU or cache-equivalence claim follows.

Raw common/progress reports, console and ready screenshot are preserved by the feature owner in `parallel-far-candidate/root-pilot-212fd1fe/`. Tab 987 was closed and viewport reset; final browser inventory empty. Source inspection found the first ground-bearing request includes all species slots, while later adapters request their own regions independently. Deterministic data reuse or early owned worker preparation may be worth investigating, but descriptor equivalence, cancellation and full resource readiness must be proven before changing that path.
