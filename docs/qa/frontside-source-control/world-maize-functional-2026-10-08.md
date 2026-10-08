# First native WorldScene maize functional check

Branch `codex/frontside-model-repair`, frozen fixture051f1833; native IAB tab861,
2026-10-08. Candidate binary SHA256
`3eba51ae256663c20bdfcfc4f9e0133a304e8a6dfa25b072a07154b82f0ee65c`,253326bytes.
The author is archiving the exported raw report and three original/derived PNG
pairs in that branch before integration. Root keeps independent cache copies.

Actual archived Gran Río/Suajili farm:1257 live plants,152 maize,18 mature maize.
Original growth bridges and all other crops/workers remain unchanged. The adapter
replaces mature maize only, shares live growth and uses FrontSide color with
DoubleSide shadows. Capacity2048; three material groups.

Native actions completed: load, paired capture, original save/restore, activate
candidate, candidate save/restore, paired capture, harvest request on a copy,
change presentation time, paired capture, export and dispose. Both memory
SaveRepository roundtrips retain exact serialized hashes. Each paired capture
keeps logical state and matching camera unchanged. Harvest copy creates the real
harvest task and serializes successfully; no worker delivery is proved here.
Final cleanup reports closed/contextLost true and errors empty. Tab closed;
inventory empty before releasing GPU to loading QA.

Instrumentation problems retained: tab860 failed before world construction
because HTTP already decoded gzip and the fixture decompressed it again. Fixed
by checking gzip magic bytes. Tab861 initially reloaded when Vite lazily optimized
BufferGeometryUtils; the same tab was inspected, then loaded explicitly after
the module became ready. No timing benchmark was run in this check.

Three captures use times0,0,450. These are nighttime presentation, so this run
does NOT prove day/night coverage. The toggle's threshold selected450 from0;
a separate time150 daylight capture remains necessary. Root inspected the first
and last paired images: wide nighttime framing makes the18 mature maize too
small/dark for sufficient perceptual acceptance. Human visual approval remains
pending; closer relevant views and animation/growth continuity are required.

Submission counts221→225 and triangles7,430,602→7,430,494 are diagnostics,
not GPU performance evidence. The synthetic1089-maize net benefit17.48% must not
be inherited as a WorldScene improvement. Dense repaired-maize GPU AB/BA,
real VFX/depth, lifecycle/resize, growth/harvest/delivery and remaining models
remain pending. No assets or production FrontSide policy promoted.
