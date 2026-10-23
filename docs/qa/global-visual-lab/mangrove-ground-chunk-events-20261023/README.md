# Mangrove cache chunk events

## Verified milestone
The QA cache now observes existing Three scene child-added/child-removed events. Ground registration happens once per chunk arrival, not once per frame. Native installation already inserts the group in world.chunks before scene.add; removal already calls scene.remove before disposing masks/materials. The observer releases the detailed-region queue entry on removal and tracks material retain callbacks used by quality clones. No Wild Engine or simulation changes.

Real Chrome/Intel UHD, seed 712, medium quality, 720p, populated paused scene with distant impostors:

| Position | Resident chunks | Registered chunks | Total added | Total removed | Fine entries | Pending |
|---|---:|---:|---:|---:|---:|---:|
| Initial | 25 | 25 | 25 | 0 | 1 | 0 |
| Camera/target +144 m X | 25 | 25 | 40 | 15 | 0 | 0 |
| Return | 25 | 25 | 55 | 30 | 0 | 0 |

No browser or GL errors. This proves chunk registration and release of the prior fine target during actual world streaming. It is deliberately not a benchmark: the observation probes wait for chunk/horizon completion and do not measure uninterrupted streaming frametime.

## Remaining work
New arrivals currently use their original material; automatic cache creation, projected LOD updates, transition blending and event-driven rebaking of changed content are still pending. The fixed coarse reservation does not yet track subsequent disposal, so its queue byte counter is conservative after streaming and must not be presented as current resident VRAM. Dynamic quality changes are observed but cache shader replacement across shared materials is not yet integrated. Do not enable by default or generalize to other biomes.

## Tests and reproduction
`node --test tests/mangrove-chunk-events.test.js tests/material-bake-queue.test.js` passes eight tests. They cover existing/streamed registration, disposal order, ignored unrelated biomes, quality-clone registration/release, listener cleanup and the queue ownership cases.

Run the hybrid harness with WG_VARIANT_SEQUENCE=regionevents, WG_PHASES=day, WG_VIEW=normal, WG_COVER_QUALITY=media, WG_MODES=cadence, WG_SAMPLES=30, WG_WARMUP=30 and WG_REVIEW_OUT set to this folder. Clear WG_DRAW_CENSUS and WG_FRAME_STEP. `benchmarks.json` includes the streaming probe in sceneAudit.ablation.streaming; its cadence window is diagnostic only because the returned scene no longer contains the initial complete cache selection.

PR #159 remains draft. The accepted performance result remains the earlier medium-quality static-region ABAB series.
