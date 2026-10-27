# Canyon mineral shallows pilot

Reproduce: `node tools/experiments/capture-canyon-bank-mineral-review-20261022.mjs`, Vite5190. Seed712/media/1280x720, three poses day/night, baseline/prior green sediment/mineral sediment. Eighteen real captures. All paired camera/time/calls/triangles match; no captured console/GL errors.

Mineral variant changes the prior sediment palette to muted brown/olive and width to2-7 world units. Existing two-float vertex bank data and shader noise are reused, with no new draw calls. It is QA only and has no measured performance result.

Important harness correction: initial run silently missed resident water because the Mangrove integration changed the creation anchor. That run was overwritten after fixing the route and adding a missing-anchor assertion. The final captures include resident and horizon patches. Older capture scripts with the obsolete anchor require correction before reuse; this finding does not invalidate historical captures made before the source change.

Normal day view inspection: the new palette softens the blue/land contrast, but appears as blurry bands, with an unnaturally straight land boundary still visible. This does not yet meet the artistic target. Keep as reference, do not integrate or justify additional benchmarking before improving shore structure. Other views/night are captured but not yet individually reviewed. No change to simulation or terrain geometry.
