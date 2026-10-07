# Isolated LOD1 atlas comparison — not accepted

Acacia paraguas slot0 is baked offline from native LOD1, with unchanged LOD0 framing, base, sun,8 horizontal views,8 tree world orientations,128px cells and8 degree bake elevation. Day/night alpha WebP lossless1024x1024 use the same texture storage as LOD2, not a memory optimization. Production manifest and native LOD selection are unchanged. Fixture atlas-lod=1 overrides only this species through injected loadManifest; no deployed asset switch.

Paused density-path13.2s matches the prior LOD2 camera exactly[-43.49710893312456,17.708301721455364,191.85039633264967]. ID0:-2:10 distance56.861410m, nativeLOD1 color0.06615124, sprite0.93384876,density1. Camera elevation from its base is13.861913 degrees. LOD1 fills canopy more faithfully, but visible Bayer remains at the right border. This is NOT full acceptance or proof that replacing all atlases solves free-camera silhouette mismatch. Native scene day/night errors/WebGL0. Both reports/screenshots saved. Middle120m irregularacacia density is1 after faithful range extension; this separate density case no longer stipples.

No performance benchmark here; root CPU candidate was running in the background. New density parameters and static priority still require current-source combined GPU measurement.

Sharp verification: alpha and RGB wherever alpha>0 are byte exact day/night; invisible RGB under alpha0 is discarded by WebP (2070214/2002756 changed RGB bytes), so do not claim full RGBA byte equality. SourceBounds min/max, framing and base are unchanged (object property ordering differs only). Candidate pair1127380 bytes vs current945316 (+182064).
