# Canyon shared sand bed pilot

Reproduce: `node tools/experiments/capture-canyon-bank-bed-review-20261022.mjs`, Vite5190. Seed712/media/1280x720, baseline/bed, three poses day/night. Twelve real captures; all paired camera/time/calls/triangles equal, no captured errors.

Borrow existing BiomeGround sand color texture (no new texture allocation) and its rotation, scale and seed offset. Estimate bed depth using the canyon cross-section formula and interpolated bank width, then attenuate sand visibility exponentially with depth and viewing elevation. Existing reflection, sunlight and shadows remain. Adds one texture sample and scalar arithmetic, no draw calls or geometry. QA borrowing assumes the existing world-owned material/texture lifetime; production integration would need explicit review.

This is an approximate material response, not screen-space depth, refraction or actual submerged-terrain rendering. It omits the bed's normal lighting, light-path scattering and view-ray displacement. Normal day inspection removes the floating patch appearance of the rejected granular trial, but the contribution is subtle and the geometric shoreline remains straight. Retain as a study base, not a claimed global improvement. Night and other views captured but not yet individually inspected. No performance measurement; no native adoption.

Next avoid more tiny tint tuning: inspect cross-section versus actual visible intersection and choose a shared land/water material transition, with a clear visible improvement gate before benchmarking.
