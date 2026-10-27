# Canyon depth-mask density diagnostic

QA-only source route increases Canyon bed sampling from2 to8 per metre, retaining513 dimension cap. All production files unchanged. Twelve medium1280x720 seed712 frames, full backgrounds. Against reviewed-five-biomes-20261022, all cameras/draw calls/triangles match and no recorded GL/page errors occur. comparison.json counts RGB changes for six native views; pixel differences are not a quality metric.

Inspected reverse daytime image: sawtooth shoreline persists despite denser sampling. Do not adopt higher mask density as the solution. This supports investigating the actual one-metre terrain intersection/visual bank transition rather than treating half-metre mask resolution as the principal cause; it does not mathematically isolate every contributor.

C++ surface() in spatial-savanna.cpp interpolates the same one-metre triangular lattice continuously; spatial_surface_anywhere calls it directly. No integer-only query rounding was found. Higher mask density cannot restore a smoother terrain that is absent from that lattice.

Cost: up to approximately16x texels before dimension caps, same fragment texture fetch count. No measured GPU or preparation-time claim. Original mask remains active. Future QA should soften the visible bank using material treatment while preserving logical water and terrain boundaries, then verify movement and cost.

Reproduce with server5190: node tools/experiments/capture-canyon-depth-density-20261022.mjs. Clear WG_REVIEW_* environment overrides first if present.
