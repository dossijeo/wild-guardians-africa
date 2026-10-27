# Quality material invalidation fix

Full medium -> low -> very-low -> medium roundtrip previously changed42201 tree pixels by day, also reproduced with original dense cover (42919pixels). Fern geometry was not the cause.

Combined LOD/shadow toggle reproduces part of the error; waiting/recompiling before a quality change and independent toggles do not. Forcing scene materials to recompile after the complete transition restores exactly0pixel difference. This identifies stale program state after changing grouped material selection alongside shadow availability.

Fix: NativeAssetGroups maintains a material invalidation epoch incremented by qualitySetting when solar-shadow availability changes. A selected base material or late fade clone is marked needsUpdate once per epoch. Groups with unchanged epoch and fade count skip the loop; no repeated material array allocation or buffer upload on stable frames. Existing culling, dirty ranges and independent shadow populations remain intact. Other renderer materials retain their existing immediate invalidation.

Validation with final guard: native ferns, day AND night, both settled medium returns are pixel-identical (0pixels) to the initial image. Full quality states/2048-map restoration, coverage and GL status recorded in quality.json. Original-cover control now differs only4pixels,max36 rather than42919; residual not claimed exact. No density or lighting reduction.

22 targeted tests pass (asset groups11,fern2,shadow camera3,render quality6). New regression covers base/late fade material invalidation once, zero repeated uploads, and quality invalidation only on two shadow-enable transitions. Existing render-quality fake world required the new asset-group invalidation contract; its state/geometry invariants still pass. Production build passes with existing chunk/import warnings.

This fixes the observed Mangrove transition; it is not six-biome visual revalidation, motion/streaming completion or an FPS improvement claim. No simulation changes. Reproduce probe-holly-fern-native-quality-20261023.mjs with WG_CARD_TREATMENTS=cards and WG_REVIEW_OUT pointing here. All images are actual renderer captures,1280x720,seed712,complete backgrounds.
