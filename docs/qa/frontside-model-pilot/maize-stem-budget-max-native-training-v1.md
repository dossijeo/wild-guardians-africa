# Native 658-stem DoubleSide training rejection

Status: **REJECTED before FrontSide**. One training sample, not held-out acceptance, not a GPU benchmark and not category validation. Root executed the frozen `a73ad920` fixture on native tab 778, exported the POST and comparison, then closed the scene/tab.

Source GLB SHA256: `be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef`. Derived archive: `cb6b139a611ea35f6cbf5a5c80c2fc9d1fed8999ec477b70b68e560a3586dbc9`. The archived report and authoritative POST both hash to `f71d84223e7c09db0aa0fdd415105dbfc2b36f3a24dac2c9205503acd94e0ead`.

Maize mature, Sabana/day, growth 1, clock 1.75, elevation 32.5°, azimuth 26.25°, 1024-pixel fixture. Three original repeat controls are bit-exact. Indexed original DoubleSide is bit-exact and passes. Both derived DoubleSide arms, including the two-group arm, fail with identical metrics:

| Metric | Result |
| --- | ---: |
| Alpha IoU | 0.9988457869 |
| Missing / added pixels | 55 / 193 |
| Missing / added beyond one pixel | 13 / 149 |
| Linear RGB MAE | 0.00224052745 |
| Maximum 16-pixel tile MAE | 0.14401417527 |
| Largest RGB regions | 1406 / 1110 / 828 pixels |

Most missing regions are contour changes; one interior region has five pixels and diameter bound 2.8284. Both local color and silhouette gates fail. Nothing is promoted, and no timing or benefit is inferred from the resource projection.

The contract analysis records the same GL program/sources, uniforms, texture/sampler metadata, matrices and vertex-attribute layouts. CPU materials, iGrowth and instance matrices match. Tangents are absent in all arms. Bounding boxes and centers match; the sphere radius is 1.2209732132 for originals and 1.0665873531 for derivatives. With no corresponding active uniform change, the sphere difference is not identified as a cause. GPU texels, interpolation, TBN and occlusion remain unproven.

Root reports console warning/error lists empty and six CPU workloads active: four historical campaigns 20024/49032/41320/41304 and two files of its full suite. The URL condition string records the campaigns with inventory required; it does not represent an exhaustive idle-machine claim. This was visual QA only.

The separate original-normal restoration candidate retains exactly this geometry/UV and has not yet had native quality QA. Its attribute correction cannot be declared to resolve this rejection. No reserved view or gate is changed to accommodate the result.
