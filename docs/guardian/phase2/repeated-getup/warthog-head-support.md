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
