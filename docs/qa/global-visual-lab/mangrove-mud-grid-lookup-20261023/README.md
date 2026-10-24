# Numeric terrain lookup for mud transitions

Replace repeated formatted-string keys on the integer terrain lattice with exact numeric keys. Preserve the original four-decimal lookup for irregular coordinates, including distinction between negative values rounded to -0.0000 and literal zero. No interpolation weights, contour distances, normals, colors, shader or geometry density are changed.

Intel UHD / 720p / medium / day, same continuous streaming preparation diagnostic as water-preparation-detail. 30 bindMangroveMudEdges calls: mean 3.347 ms, max 6.4 versus prior mean 5.487, max 9.6. This is a single before/after diagnostic (~2.14 ms mean reduction); it is not ABAB or proof of total frametime improvement. Follow-up whole-path measurement remains required.

Full capture differs at 22 pixels, MAE 0.000165 (RGBA), with no reported browser errors. Differences are not attributed; exact full-image/attribute equivalence is not claimed. Key-equivalence test verifies collisions and lookups against the legacy formatting for lattice, irregular, boundary and signed-zero coordinates. The test caught a negative-zero corner case, fixed before commit. Timing capture predates that extra guard; integer-grid mapping is unchanged, but final timing needs revalidation.

Selected fixed512 cache, approved ground appearance, shoreline and fern density remain intact. This optimization targets measured CPU preparation, not new artistic changes. Run node --test tests/mangrove-mud-grid.test.js. Runtime reproduction uses WG_PREP_DETAIL=1, WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=preparation, WG_SAMPLES=240, WG_WARMUP=30 and WG_REVIEW_OUT=<new directory> with measure-mangrove-ground-hybrid-20261023.mjs.
