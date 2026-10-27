# Retire automatic far-root depth preparation

Second Manglares ABAB: CPU maxima A234.84/B53.91/A313.90/B46.45 ms, no slow GL calls in B. Settled times A18.537/B19.385/A19.929/B23.209 seconds. Both pairs worsen completion latency; P95 callback improvement is not consistent. Same 15 chunks and 240 advancing travel frames. All runs expose 13 medium-quality frames; differing medium exposure does not explain this test.

The renderer.info counters are last-render-pass snapshots, not complete frame geometry totals. Existing warnings retained. Active simulation and asynchronous publication remain possible confounds; do not claim an established GPU cause.

Restore the three production integration files to 7d00e96a7. Keep the isolated helper/tests and historical commits for research. The promising Volcanes result is insufficient to enable this globally. Next design must avoid preparing each root and safely identify missing exact program variants, preserving ownership/context invalidation. No change merged into main.
