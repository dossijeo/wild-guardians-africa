# Loading ornament: actual Tinify pilot

Runtime base: `f91987c7`. The existing display-color WebP was optimized by an actual Tinify request. The candidate is archived here, outside `public`; no runtime file, alias, loading scene or image reference was replaced.

Encoded size falls from 1,117,368 to 169,756 bytes: 947,612 bytes saved (84.81%). This is a candidate's encoded-byte saving, not a published build reduction, GPU-memory reduction or performance measurement. Both files remain 2172 × 724 RGBA. Alpha values match exactly at every pixel. Alpha-weighted RGB mean absolute difference is 2.74046 on an 8-bit scale; maximum RGB difference where alpha is at least 0.5 is 69. These diagnostics are not visual acceptance thresholds.

`day-comparison.png` and `night-comparison.png` show the original above the candidate, flattened over representative light/dark solid backgrounds and reduced to half size. They are offline pixel composites, not screenshots of the game. Model inspection finds preserved wood, vines, flowers, parchment and silhouette, with mild smoothing/color differences. Actual browser/native loading-screen review remains pending before production adoption. Transparent hidden RGB must not be mistaken for visible corruption when inspecting an uncomposited image.

`provider-report.json` records the completed request and structural comparison. `cache-reuse.json` proves the verified result was subsequently reused with **zero network calls**: the injected fetch implementation rejects all requests and only a placeholder credential is used. The private provider location and authorization are not included. Only the sanitized receipt and candidate are archived.

Reproduce the offline evidence without API access:

```sh
node tools/compare_color_composites.mjs public/assets/ui/loading-ornament-v2.webp docs/qa/tinify-loading-ornament/candidate.webp .cache/ornament-reproduction
node --test tests/tinify-image-cache.test.js tests/tinify-color-policy.test.js
```

The 14 cache/color-policy tests pass. They cover integrity, reuse, interrupted-output resume, upload exclusion for data/unknown/profiled images and credential/provider-location protection. They do not establish GPU or in-game visual acceptance. `receipt.json` pins input/tool and archived evidence hashes.
