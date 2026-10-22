# Six-biome native composition review

This is an integration baseline and artistic gap review, **not proof that the six mockups have been matched**. The six day sheets were inspected individually. Their reference panels have different world layouts and cameras; they support artistic assessment, not pixel-error scoring.

## Reproduction and scope

Run Vite on port 5190, then:

```sh
node tools/experiments/capture-six-biome-native-review-20261022.mjs
python tools/experiments/audit-six-biome-native-review-20261022.py
```

The explicit opt-in query is exported by `tools/experiments/global-native-recipe-20261022.mjs`. No default is changed. Seed 712, media, 1280x720, fixed elapsed/wind time 2, day time 150 / night time 350, three camera poses per biome. Exact cameras and counters are in `captures.json`. The only source interception exposes the world for observation; no QA replacement shaders, coverage layers or material adapters are installed. Paused simulation and settled chunks make these still-image comparisons reproducible but do not test gameplay or fast streaming.

36 real renderer frames completed with no captured console/HTTP/WebGL errors. The audit checks active native coverage in Savanna, River and Mangrove. The six contact sheets contain day frames; night PNGs remain available separately. Passing this audit does not establish artistic success.

## Observed artistic gaps and decisions

| Biome | Retain | Remaining difference from reference | Next useful experiment |
| --- | --- | --- | --- |
| Savanna | Warm dry floor, readable tree shadows, visibly continuous short grass in oblique view | Coverage has similar fine density across broad regions; reference has larger light/dark accumulations and more natural bare-to-grass boundaries | Compare deterministic broad height/density variation at fixed instance budget; preserve paths and current warm palette |
| Great River | Green continuous cover and clear settlement access | Repetitive small-scale clumping reads as uniform carpet from above; bare settlement lanes have broad abrupt borders | Vary coverage by larger correlated patches and refine edge taper without simply increasing instances; add a water-facing view before judging river quality |
| Mangroves | Moss relief and wet/bare soil separation, retained leaves | Settlement view is dominated by continuous moss rather than the reference's layered leafy wetland floor; distant vegetation and banks are sparse | Inspect a representative wetland/bank camera and coverage masks first; do not infer that more density everywhere is the solution |
| Desert | Approved dune mesorelief, warm highlights and substantial building/terrain shadows | Less small-scale rocky/vegetated breakup than reference; reference composition is more varied | Preserve approved material; evaluate existing detail coverage outside settlement before changing lighting again |
| Volcanoes | Dark fractured rock, readable warm buildings, distinct lava | Broad gray exposed areas and relatively cool rock highlights; reference has warmer relief highlights and richer local dry vegetation | Compare a restrained warm direct-light response on rock only, with matched night captures; do not brighten ambient globally |
| Grand Canyon | Warm strata, near ripples and softened distant material | Water reads as a uniform blue strip with hard banks; shadowed shore becomes a broad dark band. Reference has turquoise shallow transitions and irregular bank detail | Highest-priority next pass: evaluate retained bank-depth QA against native baseline, then integrate only if day/night and movement remain coherent |

No model silhouette, authoritative terrain geometry or simulation change is warranted by this review. Missing reference objects cannot be solved by a material adjustment. Do not discard attractive variants solely for cost; measure and optimize them separately.

## Counters, not timing claims

The ranges below cover the three day poses; night counters match their corresponding day poses exactly.

| Biome | Draw calls | Triangles |
| --- | ---: | ---: |
| Savanna | 40–72 | 1,536,484–1,927,535 |
| Great River | 36–66 | 888,233–995,285 |
| Grand Canyon | 32–39 | 232,389–399,675 |
| Mangroves | 44–66 | 511,661–617,752 |
| Volcanoes | 40–69 | 384,666–502,116 |
| Desert | 32–47 | 193,647–225,117 |

These are renderer counters, not hardware triangle throughput or overdraw. This capture pass contains no new CPU/GPU benchmark. Prior subsystem A/B/A/B results remain in their respective native integration reports and cannot establish the cost of this entire recipe. Full-recipe moving-camera timing, modest profiles, additional seeds, rapid streaming and live placement invalidation remain required.

## Recommendation

Keep this native composition as the reproducible experimental baseline. Continue with Canyon shore/water integration, then larger-scale River/Savanna coverage structure and a representative Mangrove bank view. Do not mark the global art goal complete or merge into main on the strength of native/QA parity alone.
