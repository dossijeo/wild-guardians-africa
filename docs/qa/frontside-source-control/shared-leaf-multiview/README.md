# Shared leaf geometry: prospective native comparisons

Four sequential IAB captures use the frozen functional fixture at
`353036e9fe7d450889530298ba3e8213ecd26f4f` on the repair branch. The fixture JS
SHA-256 is recorded in the receipt. Later branch commits only prepared CPU QA
analysis during this window. Main archives evidence, without promoting assets.

Each image contains original DoubleSide, cloned original DoubleSide control,
Blender leaf derivative DoubleSide, then that derivative with three FrontSide
groups and shared geometric leaf reverses. Shadows remain DoubleSide; these
captures are not a GPU benchmark or shadow acceptance.

Cases 1 and 2 show mature maize during day (Gran Río) and night (Volcanes), from
different angles. Root visual inspection found recognizable maize, leaves,
ears and general shape, with more angular/serrated contour detail in enlarged
comparisons and no obvious major disappearance. This is an assistant inspection,
not an accredited human review or full gameplay acceptance.

Cases 7 and 8 share camera, time and lighting. Case 7 is just before the final
growth bridge ends: all arms still render the original morph. Case 8 is the first
native mature state: the derivative changes some leaf contours/detail while
retaining the general form. The still pair locates a potential transition change;
it cannot establish whether that change is perceptible during continuous growth
at normal gameplay scale. Continuous growth QA remains required.

Numeric differences and small holes are diagnostics under the user's visual
policy of 8 October, not automatic rejection criteria. Preserve functionality,
materials/UV, growth, compatibility and stability; validate actual gameplay
appearance, shadows, net dense-farm GPU benefit and resource cost before adoption.
No category-wide acceptance or PR approval follows from these four captures.

Four CPU campaign processes were confirmed live (41304, 49032, 41320, 48904).
No concurrent GPU QA was authorized. Every capture exported terminal cleanup
without errors and lost its context; each tab was closed before the next capture.
The case 2 tab had already been removed by turn cleanup, confirmed by an empty
browser inventory before cases 7/8. The exporter overwrites its output, so each
raw JSON/image was copied into root cache before proceeding.

Run `node docs/qa/frontside-source-control/shared-leaf-multiview/verify.mjs` to
verify exact raw report/image hashes, case identity, phase and cleanup.
