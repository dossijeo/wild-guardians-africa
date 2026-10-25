# Resident mask motion validation

Sabana night and Gran Rio day/night, media, 720p, 40-second out-and-back camera route, sparse GL monitoring. All recordings complete with no console errors, final GL errors or sampled simulation pauses. The farthest screenshots were inspected: terrain remains underneath vegetation. Gran Rio path and video audits pass. This is sampled visual evidence, not exhaustive per-frame visual acceptance or a performance benchmark.

At the end of Gran Rio night two chunks remain in preparation. Therefore the recording is not proof of fully settled streaming. Do not confuse coarse fallback coverage with completion of detailed chunks.

After recording, the mask update was corrected to detect visibility changes without relying on chunkRevision. It checks at most 64 cells, allocates no temporary buffer and only uploads when bytes differ. Nine ground tests pass, including hide/show without revision, installation/removal, bounds change, unchanged upload version and idempotent disposal. The recordings precede this small invalidation change and cannot claim to exercise it.

Remain opt-in: GPU cost, low quality, Volcanes/Manglares, internal height seams and quality/context lifecycle still require validation. Canyon/Desert use their separate horizon path and are outside this prototype. No simulation rules or approved vegetation density were changed.
