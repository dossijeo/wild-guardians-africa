# Dense Mangrove: position-only isolation

After user rejected the reduced leaf size/presence, isolate positional jitter: total jitter width 0.65 × spacing instead of 0.25 × spacing. QA response replacement only; no native runtime change. Original growth curve, leaf mesh, spacing, orientation, masks, color and LOD retained. Does not enable mangroveDistribution=varied.

12 real captures, seed 712, media, 1280×720, same camera/target/time/origin as reviewed-profile-20261022. Full far impostors and mountains enabled. Paused simulation and fixed visual time. No recorded browser/WebGL errors. Six final side-by-sides: original left, jitter right. comparison.json records exact pose equivalence and workload. Final draws unchanged; triangles differ -48/-24/-192 by view from repositioning and mask/distance acceptance, not leaf simplification. No timing claim.

Normal day and night pairs inspected. Leaf presence is retained, but broad rectangular patches remain clearly visible. Local regularity is slightly less apparent; this is insufficient to call the rectangular-pattern problem solved. Keep QA only and retain selected original. Next investigation should isolate the spatial coverage-mask structure at equal visible leaf coverage, rather than shrink the leaves. No biome closure claim.

Run: node tools/experiments/capture-mangrove-dense-jitter-20261022.mjs. Main and runtime sources unchanged.
