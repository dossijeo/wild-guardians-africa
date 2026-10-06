# Far biome integration: candidate

Normal gameplay has not enabled this candidate. The native-world fixture `tests/browser/far-biome-world.html` uses a paused world without saved games. `compact=1` tests a smaller resident radius: 1 versus 2 for medium, 2 versus 3 for high, and a 40-60 m tree transition. Defaults remain unchanged.

## Earlier same-residency experiment

`savanna-abba.json` was captured before the backdrop and cancellation changes in a9436f1, with 25 chunks and a 60-90 m tree transition. Four lots of 120 frames: GPU medians A1 24.70, B1 23.82, B2 24.97, A2 22.32 ms; CPU medians 6.6-6.7 ms. All 480 queries were valid. This does not demonstrate a sustained speedup. Triangles 960,014 to 955,799; calls 59 to 64.

The current version uses one continuous, lower backdrop cylinder instead of eight panels. It owns late arriving resources during cancellation. The initial JSON does not measure those changes.

`savanna.png` shows the initial elevated day camera. `savanna-horizon-night.png` also shows the initial elevated camera after a development reload; its filename is misleading and does not evidence a low horizon test.

## Memory

Four active species require eight RGBA 1024-square atlases: approximately 42.67 MiB with mipmaps; one RGBA 2048x512 backdrop adds approximately 5.33 MiB. Canyon uses two species (21.33 MiB plus backdrop). These are storage estimates, not measured total GPU/CPU memory. WebP transfer size is not decoded memory. Tests verify current-biome-only fetching and cancellation release of late textures and adapters.

Visual matching, coarse terrain seams, reduced residency navigation, angular transitions, quality profiles and combined cost still require evidence before normal gameplay activation.

## Compact-residency Sabana ABBA (bd1da2f)

`savanna-compact-abba.json` contains all 480 GPU samples, four lots of 120 frames at the same camera, 1600x900 framebuffer and medium quality. GPU p50 A1/B1/B2/A2: 21.784/18.433/18.447/21.630 ms; CPU p50: 6.5/3.9/4.2/5.9 ms. Calls: 59/43/43/59; triangles: 960014/726721/726721/960014. No disjoint, context loss, hidden frames, pending queries or game-state changes. This view shows a consistent reduction, not an FPS claim for other views/devices/biomes.

The earlier failed attempt produced no measured lots: the preceding webview stopped advancing preparation. A fresh tab completed the same source. The fixture now reports native loading stages and keeps frames running while awaiting changes in residency.

`savanna-compact-seam.png` records the flat-color seam before the mapped-ground fix. `savanna-compact-mapped-ground.png` records the later textured result, and `mangrove-mapped-ground.png` records full-residency Mangrove with shared base material. Water shoreline precision and all movement/day/night checks are still pending.

After the measurement, the world loader gained an explicit fourth argument `{farVegetation: options}`. It defaults to false; the normal game requests no far textures/worker. Optional `residentRange` ownership restores the preceding radius on disable/dispose. Logical raid-entry bounds retain normal quality radius, independently of the visual resident radius. Four directed world-sync tests verify this and preserve navigation route/suppression objects.

**Activation blocker:** the compact-residency experiment also shrinks `terrainMeshes` used for picking. A player could see approximate distant ground that cannot be clicked. A visual-only reduction with exact picking coverage, or an exact terrain fallback, must be validated before activation. Compact radius must not be presented as a completed gameplay optimization.

## Visual-only residency experiment (before exact-ground split)

`savanna-visual-abba.json` keeps 25 CPU chunks and 25 exact picking meshes but renders nine complete chunks. GPU p50 A1/B1/B2/A2: 21.369/18.555/18.079/19.744 ms; CPU p50: 5.5/5.2/6.1/6.3 ms. All 480 GPU queries are valid and game state unchanged. A1/A2 drift is significant (about 8%); both B lots are below both A lots in this single view. Calls and triangles are identical to the compact-residency case above.

This experiment still replaces visible distant ground with a coarse surface while allowing exact picking. Crops or buildings in that region can therefore disagree with its height. It is not accepted for gameplay.

The next candidate, `compact=trees`, keeps the original exact terrain rendered and pickable and shortens only native prop rendering. Clip/water batches remain intact, including their shadows. Logical IDs, transforms, hazards, and routes remain resident; hidden props regain rendering as the camera moves. The default optional-controller setting is `preserveTerrain: true`; `compact=visual` explicitly disables it for comparison. Twenty-two targeted tests pass, including original raid bounds, ownership restoration, merged and fallback prop selection. No performance result from the whole-chunk experiments is attributed to this new candidate.

## Exact terrain / shorter prop residency (8df30bd)

`savanna-tree-only-abba.json` was measured after integrating main f806e29, before main b93df1a. Original 25 exact rendered/pickable terrains remain loaded; candidate renders native props from nine chunks and retains native clip/water batches. The four lots contain 120 frames each at the same camera/framebuffer as above. GPU p50 A1/B1/B2/A2: 24.550/22.317/21.737/22.405 ms; CPU p50: 6.1/5.6/5.6/6.4 ms. Calls 59/49/49/59, triangles 960014/745279/745279/960014. All 480 queries valid, no disjoint/context loss/hidden frames/pending queries/game-state changes.

A1/A2 drift is about 9%; B1 is nearly the same as A2. This demonstrates fewer submissions in this view, **not a robust GPU improvement**, broad FPS claim or mobile result. Atlases remain allocated while the optional layer is toggled off during A lots; this benchmark does not compare memory allocation.

## Native visual smoke checks (main b93df1a integrated)

All files listed below come from one Mapungubwe village, seed 712, no gameplay saves. Four profiles are represented, not a full biome × culture × quality matrix. Native camera operations also clamp distance/height and may cross chunk borders; the JSON reports actual coordinates.

| Biome | Quality | Evidence | Observation |
| --- | --- | --- | --- |
| Sabana | Medium | `savanna-tree-only-horizon-day/night.png` | Low horizon; backdrop remains too flat/blue. This is an acceptance counterexample. |
| Gran Cañón | Medium | `canyon-tree-only-day/night.json/png`, `canyon-tree-only-orbit.png` | River and cliff terrain retained. Two resident species. Horizon-button view could enter a cliff; orbit view exposes mesa backdrop. |
| Volcanes | Medium | `volcano-tree-only-day/night.json/png`, `volcano-tree-only-moved.png` | Lateral 96 m movement changes region to 192:0; native preparation settles without GL errors. Nearby baked billboards can visibly simplify the silhouette while models prepare. |
| Manglares | High | `mangrove-high-tree-only-day/night.json/png` | 49 exact terrains and 25 prop chunks; water channels/moss remain native. Angular movement and night phase tested. |
| Gran Río | Low | `river-low-tree-only-day/dusk.json/png` | Original river near terrain; angular movement and mixed day/night atlas phase. Coarse far shoreline remains approximate. |
| Desierto | Very low | `desert-min-tree-only-day/night.json/png`, `desert-min-tree-only-horizon.png` | Native dunes/coarse horizon retained; mesa backdrop visible. Sparse tree population in reference scene. |

Recorded JSON checks show zero world/shader/WebGL errors; no missing-biome asset exception. Static captures are not proof of imperceptible animated transitions. Native 8° atlas elevation is appropriate for distant trees, but the 40–60 m candidate transition remains visibly simplified in elevated/teleported views. Remaining acceptance work: slow approach/retreat and lateral/orbital recordings, delayed-chunk perception, precise far shorelines, backdrop art/composition, independent performance repetitions, mobile/device memory and other cultures. The optional loader is connected but **normal gameplay remains OFF**.

Runtime atlas storage is bounded by active biome (eight 1024² atlases for four species or four for canyon), plus one backdrop. Cancellation tests release every borrowed/owned late resource exactly once; those tests do not measure browser caches, driver residency, decoded CPU images or total game RAM. Distributed atlas transfer is 20,450,296 bytes for all 22 species, not 235 MiB of simultaneous GPU textures.

## Slow approach counterexample (after 287099e)

The fixture now has 20-second native-camera paths for approach/retreat, orbit and lateral movement; it selects an unsuppressed slot-0 tree and reports completion and unchanged game state. Only approach has been run so far. `savanna-slow-approach-mid.png` shows selected tree `0:9:2` during approach/retreat with readiness zero; `savanna-slow-approach.json` records final state and preparation counters. The final view is far again, so readiness zero there alone is expected and does not prove a failed near handoff.

The same report contains approximately 100 cancelled preparations per species over the movement versus 10–12 useful completions. This repeated cancellation is an acceptance blocker to investigate, not a successful motion test. One candidate cause is texture preparation re-yielding between already initialized textures on each native packing generation; that hypothesis still needs a repeated native path after correction. No FPS/cost claim is made for this path.


## Warm-texture preparation isolation (5965323 + temporary alias)

A temporary Vite alias replaced only the GPU preparation helper, leaving the source revision under the serial full-test suite unchanged. The candidate remembers initialized texture wrapper/source versions per renderer, invalidates on disposal/context restoration and keeps compile, zero-pixel draw and fence for every new native packing. Fourteen isolated tests pass, including late cancellation, failed upload, context loss/restoration and listener ownership.

`savanna-cache-approach.json` repeats exactly the same slot-0 tree `0:9:2`, 20-second 140→25→140 m path. The selected tree reaches readiness 1 first at 10.216 s; only 28 of 164 near frames (≤40 m) have readiness 1. Useful preparations at completion: 21/20/19/17; cancelled: 95/89/93/91. No game-state or WebGL errors. These counts show increased useful completions but **do not resolve the continuous-motion transition**.

`savanna-cache-hold.json` adds a three-second stationary hold at 25 m. Readiness 1 occurs first at 10.203 s, with 115 of 261 near frames fully ready. Useful preparations: 32/28/28/23; cancelled: 76/73/74/75. This verifies that the handoff can settle when stationary; renewed motion still invalidates it. Counters are not a performance benchmark, and the duration/near-frame counts differ between these two paths.

Next isolated check: scope render-generation invalidation to the tree species whose proof is being prepared. Currently replacement of any merged prop geometry invalidates all tree species; CPU batch records also reset when LOD packing changes. Neither cache-only result is accepted for gameplay activation.
