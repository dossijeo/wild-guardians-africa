# Opt-in animal model prefetch candidate

Status: source/contracts only. No native run, dispatch, promotion or PR is authorized by this receipt. Shared-ground remains OFF by default.

## Evidence and hypothesis

The original dense visibility smoke in run 37968356735 spent about 81.732 s from its first retained observation to entry into load-far-assets, then failed the original 90 s world-ready gate before minimizing. Its awaited animal model stage was 10.315 s; warm GPU preparation was 24.459 s, including (not in addition to) world compilation 11.467 s and depth preparation 4.288 s. These are awaited intervals, not measurements of exclusive CPU or physical transfer. Independent/nested spans must not be added.

The candidate overlaps preparation of the original five animal GLBs with sky, biome, village and building preparation. It does not assert that 10.315 s will disappear: response scheduling, parse CPU, memory pressure and other overlapped work may dominate instead.

## Single change

`__desktopSmokeAnimalPrefetch === true` starts models.json and exactly the five descriptor URLs (warthog, hyena, buffalo, lion, rhino) at the beginning of WorldScene.load. The absent/false flag uses the original path. The catalog promise is reused at its normal catalog stage. All five model promises must complete successfully before normal AnimalPreload.warm runs.

The same Assets collection and exact logical URLs retain existing Promise-cache identity, transfer accounting and ownership. No alias cache, new reader/protocol, renderer, upload queue or decoded-buffer copy is introduced. Model prefetch does not create AnimalPreload, mixers or rigs. Assets.model allocates/decodes the original GLTF resources but does not call renderer.initTexture, compile or render. The normal warm stage creates rigs and all later geometry adoption, uploads, program readiness, CPU16 pacing, fences and far preparation remain in their original order.

No village BIN/texture concurrency, wall fan-out, VFX constructor reordering or other optimization is included. Collective/parallel readiness and parallel diorama assets remain unchanged/OFF; shared-ground remains OFF unless explicitly enabled by an independent QA run. No smoke workflow or deadline changes are included.

## Ownership and failures

Both background promises install rejection handlers immediately; these handlers observe the failure without converting the consumer promise into success. The catalog or ready consumer receives the original error. Existing WorldScene.loadReady provides cancellation while awaiting the catalog and the group. Cancellation prevents model starts after late catalog completion and prevents normal rig readiness from proceeding. It does not interrupt already-dispatched GLTF decoding/transport; Assets.disposeModels remains the owner and disposes late decoded geometries/materials/textures through ownModel. The prefetch never disposes the shared Assets collection independently.

Potential cost: all five decoded GLTFs may reside earlier alongside biome/village data. This can increase peak RAM even though retained resources and later readiness are unchanged. Neither physical RAM nor VRAM was measured; native evaluation must report that limitation and detect new stalls/errors rather than assuming concurrency is free.

## Contracts and next review

Eight directed contracts use actual Assets cache/ownership, actual AnimalPreload rig creation and WorldScene load/loadReady/warmAnimalModels paths. They cover exact shipped URLs and one underlying loader request per URL; later reuse without new loads; no rig construction during prefetch; all-five readiness; immediate rejection observation and original error propagation; missing descriptors; abort during pending GLTFs and disposal of five late geometries/materials; no model requests after late catalog delivery; and real World.load opt-in/default behavior while sky is pending.

The GLTF transport itself is controlled by a loader double in these CPU tests. They do not establish native delivery speed, shader readiness, raster equivalence or peak-memory safety. The first test-fixture attempt used unresolved URLs and missing Running clips; those fixtures were corrected to the shipped URL resolver and real AnimationClip data without changing production asset lookup.

Validation: 46/46 directed tests passed (animal-model-prefetch, loading-programs, shared-ground-clip, shared-ground-clip-probe); no GPU tests or dispatch. Parent source review is required before wiring an isolated smoke invocation. Any later invocation must retain world-ready 90 s and original minimize/restore gates, report raw ok/error independently of step conclusions, and keep other experimental flags fixed.
