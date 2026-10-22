# Mixed gravel/sand bed: reject native adoption

Reproduce: `node tools/experiments/capture-canyon-bank-mixedbed-review-20261022.mjs`, Vite5190, seed712/media/1280x720, litbed/mixedbed, three views day/night. Twelve captures, paired camera/time/draw calls/triangles equal, no captured errors.

Uses existing ground gravel color and sand textures, native materialNoise implementation and soft canyon sand deposit weighting/UV scales. Adds one gravel sample and two noise evaluations relative to litbed. It does NOT reuse the complete ground material: gravel color adaptation, POM, gravel normal, contact AO, macro slope and warm shadow fill remain absent. Therefore this cannot establish lighting parity even though textures/weights are shared.

Normal day inspection: granular pale edge becomes stronger and reads as foam rather than a submerged bank. Reject native adoption for artistic mismatch. No timing benchmark warranted yet. Night/elevated/reverse captured but not individually reviewed. Do not claim performance or final visual quality.

Further hand-copied partial ground approximations risk reproducing this failure. Before another visual trial, inspect the complete ground material transformation and its linear/color-space contract; any shared implementation must preserve that contract and ownership. Existing authoritative terrain and simulation remain untouched.
