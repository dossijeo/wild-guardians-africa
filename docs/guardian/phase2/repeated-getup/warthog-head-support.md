# Warthog head support correction

A fresh native pose reproduced the late-entry head penetration at age 0.44988 s.
Full non-tail skin minimum was -0.04018157 m at Mesh_0_1 vertex 5264, while
the original 1058 support samples reported +0.01907793 m: a 0.05925950 m miss.
The recorded pose is preserved as
`tests/fixtures/warthog-recovery-negative-surface-pose.json.gz`; its full replay
differs from the browser minimum by less than 1e-15 m.

Recovery contact selection now adds 96 distributed directions for bones named
Head/Jaw to the existing axis/diagonal support directions. Other bones retain
their previous sampling. The selection is cached at preparation time, not
recomputed each animation frame. This pose now uses 1174 samples and misses the
full minimum by 0.00491318 m, within the existing 0.01 m support margin.
No geometry, animation clip, collider dimensions or global root offset changed.

Seven tests pass: captured head support, entry settling and five-species slope
recovery. The captured-pose test requires positive full-skin clearance after the
normal sampled support correction and retains a sparse sample-count bound.

Native repeat validation: `warthog-head-support-fixed.json/mp4/jpg`. Both hits
and final recovery complete, errors empty, maximum one Guardian. Four small
negative samples remain at ages 0.9497–1.2996 s; lowest -0.00148675 m. This is
not proof of perfect contact or a deterministic same-trajectory A/B comparison.
The original centimetre-scale defect is demonstrated by exact pose replay;
the new native run provides separate integration evidence.

The 1 fps sheet was inspected: fall, recovery interruption, second cast and
upright return are visible. Wide framing does not certify fine contact details.
The first rerun was interrupted by a Vite source reload during newline cleanup;
it was discarded and restarted after files were stable. Only the completed run
is published. Audio was disabled and no performance acceptance is claimed.


## Support cost and obstacle regression check

11/11 tests passed across authored-recovery-solids, beast-recovery-exit and baked-solid-contacts, with zero skips or failures (106.81 s). Compressed TAP: head-support-solid-tests.tap.gz. These automated checks cover the fixture obstacle cases; they do not replace graphical inspection near every structure.

The reproducible benchmark tools/guardian/benchmark-recovery-head-support.mjs compares the previous 0d4e3b224 sample selection with current selection on the same installed models. After warmup it alternates order over 30 paired blocks of 100 support scans. No tests/build ran concurrently.

| Species | Samples before / after | Median scan ms before / after | Added ms |
|---|---:|---:|---:|
| hyena | 1245 / 1361 | 0.2232 / 0.2462 | 0.0230 |
| lion | 1582 / 1633 | 0.3601 / 0.3723 | 0.0122 |
| warthog | 1058 / 1174 | 0.2127 / 0.2383 | 0.0256 |
| buffalo | 1393 / 1467 | 0.3570 / 0.3796 | 0.0226 |
| rhino | 1830 / 1857 | 0.5603 / 0.5765 | 0.0163 |

Raw paired measurements: head-support-cost.json. This measures only sparse vertex skinning/world transformation and minimum-height reduction in Node, with a static standing pose. It excludes pose animation, sample-cache construction, terrain lookup, cloth correction, browser rendering and frame tails. Block percentiles are percentiles of batch averages, not individual-frame percentiles. The increase is small in this isolated operation, but does not certify total recovery or Wild Engine performance. The native residual penetration of up to 1.5 mm remains recorded above.
