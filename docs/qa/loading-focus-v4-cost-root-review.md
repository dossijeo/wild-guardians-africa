# Incremental loading focus cost: root review

Root completed the declared day A1/B1/B2/A2 then night A1/B1/B2/A2 sequence
on V4 runtime3101dbff, candidate focus patch45201f7d (night central3.00,
day1.30, edge0.60). The private reference omits the focus hook and restores
pre-focus mist; geometry, public asset hashes, sky, UI, camera and harness
remain matched. Root independently compared the source inventories: only
the declared focus-related files differ. Served crop-batch hashes differ
solely through Vite dependency query/source-map rewriting, with identical
disk source. The amount-zero control was not used.

1280x720, medium, growth78%, reduced motion, fixed1/60 clock, 120 warm-up,
300 queried draws and120 drain frames per arm. All eight reports reached
frame540 with300 valid GPU queries each, zero disjoint events/pending queries.
All raw540 frame entries, including startup/null and outliers, are retained.
CPU draw/overlay and GPU draw scopes are separate; CSS is outside GPU queries.
Agent CPU/GPU work was quiet; no concurrent heavy root work was performed.

| Arm | Day GPU median ms | Night GPU median ms |
| --- | ---: | ---: |
| A1 | 3.0120825 | 5.4305465 |
| B1 | 4.4773170 | 5.7438795 |
| B2 | 4.5552340 | 5.7007545 |
| A2 | 4.3035415 | 5.3920830 |

The predeclared material-cost signal (>5% AND >0.5ms median increase in both
orders within either lighting mode) is not met. Day A1/B1 exceeds it, but
day B2/A2 differs by only0.2516925ms. Night differences are about0.31ms,
below0.5ms. Day reference drift is substantial and remains visible; A1 is
not excluded or replaced. This is not statistical equivalence, zero-cost
proof or a reason to claim improved loading time or mobile performance.

Raw report/cleanup/console files are on feature/interactive-loading-screen in
`docs/qa/interactive-loading-development/focus-v4-cost-45201f7d-root/`, with
the frozen protocol/source inventories in `focus-v4-cost-protocol/`.
Root verified each disposed report has zero geometries/textures/programs.
Temporary tabs957–964 were closed, viewport reset and Browser2 inventory empty.
No resource probes were mixed into timing and no peak RAM/VRAM claim follows.

This settles the isolated practical screen for incremental focus cost under
these conditions. Actual-menu initialization, dense save Worker delivery,
network conditions and the complete original loading acceptance remain open.
