# Resident ground mask: low-quality motion validation

2026-10-25. Branch codex/global-visual-lab, renderer reference cbf55e533.

Existing recordings completed before Chrome was closed; no new browser was launched for this audit. Both use current review recipe, seed 712, 1280x720, baja, pthreads, scheduler, groundResidentMask=1 and sparse GL sampling. Day and night each cover a 40-second outbound/return camera excursion with active simulation. See each directory active-play.json for exact URL, camera, frame and queue telemetry.

| Biome | Day observed frames | Night observed frames | Path deviations |
|---|---:|---:|---:|
| Volcanes | 1540 | 1311 | 0 |
| Manglares | 1295 | 1051 | 0 |

Both recordings pass the motion auditor: simulation advances, workers change position, chunk sets change, render origin changes, no sampled pauses or console errors, final GL error zero. Sparse sampling does not prove absence of intermediate GL errors. Frame counts include recorder overhead and are NOT a performance comparison.

Visual inspection: day-4.png and night-4.png in both directories. Ground remains beneath distant vegetation in these sampled views. Manglares retains dense foreground ferns. Volcanes has a conspicuous stepped/vertical-looking terrain join near the central background, visible by day and night; this prevents declaring the transition visually finished. Investigate height/edge continuity separately without altering approved lava. These four inspected images do not establish correctness of every video frame or all camera angles.

Auditor correction: Volcanes has no groundDetails coverage audit, so null is explicitly allowed for that biome only. Other biomes still require coverage telemetry. Sparse GL reports now explicitly require finalGlError == 0. No renderer or simulation change in this pass.

Reproduce the saved-data audit from repository root:

```sh
python tools/experiments/audit-horizon-raised-motion-20261023.py docs/qa/global-visual-lab/current-review-20261025/volcanes-resident-mask-low
python tools/experiments/audit-horizon-raised-motion-20261023.py docs/qa/global-visual-lab/current-review-20261025/manglares-resident-mask-low
```

The mask remains opt-in. Context restore, quality transitions and terrain-edge continuity remain pending. No new GPU-cost claim, no production promotion, no main merge.
