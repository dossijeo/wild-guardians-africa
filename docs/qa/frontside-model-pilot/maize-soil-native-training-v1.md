# Native soil-only training: rejected before FrontSide

Root executed frozen HEAD `c951754154b2722d33afd262528f16aaaf444cbd` in native IAB tab781, then exported and closed/disposed it. This is one existing guided TRAINING view, not category or independent multiview approval. All four arms use DoubleSide. No GPU timing or subsequent FrontSide trial is justified.

The report here matches root's preserved report byte-for-byte: SHA256 `045fdc8eb1c2d7b439cfe2234948648383f9033bfff708e2f33213af4d6d52b2`. Frame SHA256 is `3acd0b334782291797376fdcf257165a944e3e0aa0dda2d45814eac0216bd7e8`. The archive remains `e1e5886daaef7291b0553c46ea7e985661afb5e015cae7737958742bbd0185ff`, reproduced by Blender with its receipt and original source hash verified. Root preserved 19 frozen sources/receipts separately under `docs/qa/frontside-native-inputs/soil-high-interior` on main. Console warnings/errors were empty according to root's native export.

Three source repeats are exact, and indexed original DoubleSide is exact. Both derivative arms, including the two-group arm, fail identically:

| Metric | Observed | Existing limit |
|---|---:|---:|
| Alpha IoU | 0.9951439843492242 | ≥0.9995 |
| Missing/added pixels | 520 / 525 | Fraction gates also fail |
| Beyond one-pixel contour allowance | 245 missing / 301 added | 0 |
| RGB MAE, linear | 0.0056902374437341275 | ≤0.002 |
| Maximum 16-pixel tile MAE | 0.1818390953826552 | ≤0.01 |
| Largest RGB region | 4280 pixels | ≤16 |

The largest missing region is interior, 225 pixels with diameter bound 34.06 pixels; other missing regions include interior and contour errors. This is not merely a global contour/raster measurement effect. Exact original boundary fields do not prove interior surface, shading, occlusion or silhouette preservation. No thresholds are changed.

The native contract analysis is preserved separately. Live iGrowth/instance matrices match; original/indexed controls remain exact. Captured program/material/uniform/texture metadata must be read independently of changed geometry and interpolated fields; metadata equality is not a causal explanation or texel/interpolation proof. Bounds also differ and do not alone identify a cause.

Root's immediately preceding inventory confirmed campaigns49032/41320/41304 alive;20024 was absent. The old four-PID URL tag was an expectation and is not evidence of liveness. No own Blender, tests or GPU scene were active during root's capture. This was a quality screen under three confirmed CPU campaigns, not an isolated GPU benchmark.

The candidate remains disabled; all originals and previous negative reports are intact. This approach will not be extended toward FrontSide, reserved multiviews or performance measurements. Future reconstruction must preserve appearance independently of the boundary checks and budget arithmetic that this proposal passed.
