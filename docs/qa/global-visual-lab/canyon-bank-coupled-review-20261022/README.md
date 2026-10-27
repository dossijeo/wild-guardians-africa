# Canyon coupled wet-bank trial: not retained

Reproduce: `node tools/experiments/capture-canyon-bank-coupled-review-20261022.mjs`, Vite5190. Seed712/media/1280x720, bed-only control and coupled wet ground, three fixed poses day/night. Twelve real captures; paired camera/target/time/calls/triangles match, no captured errors. No process remained live after the interrupted review.

Both variants reuse the sand-bed water pilot. Coupled adds a ground wetness envelope from .015 to .20 world units above river level, gated by upward normal; albedo multiplier(.68,.76,.80), roughness approaches.32. It changes material shading only, no terrain/navigation/simulation.

Normal-view day and night comparisons inspected directly. The dark bank is noticeable, but it emphasizes the straight canal-like edge instead of blending land and water. Night produces a particularly dark outline. Reject as a final solution for artistic reasons, not performance. No benchmark run because the visual gate fails. Other poses are retained for inspection, not claimed fully reviewed.

Evidence across the recent water pilots now argues against further isolated color/noise/darkening iterations. A stronger candidate needs submerged ground lighting consistent with exposed ground (normals, BRDF and attenuated solar response), while keeping water reflection distinct. Existing bed color still passes through the water lighting path. This is the next technical gap to address, not a reason to alter authoritative river geometry.
