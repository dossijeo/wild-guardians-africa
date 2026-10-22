# Combined native Canyon surface review

Preferred candidate: warm shadow floor + soft distant sand + smooth horizon normals. Exact options in preferred-recipe.json. All are existing native renderer options; no new production code or geometry in this iteration. Keep original options for independent comparison. Default/main untouched.

## Three-way real-render comparison

Base = warm floor, original sand blending/horizon normals. Soft = warm floor + soft sand blending. Combined = soft + smooth horizon normals. Same seed712/media/1280x720, fixed visual time2, day150/night350, six poses (three near, three wide). 36 screenshots / 12 matched three-way comparisons. All cameras, time, draw calls and triangles match; no errors. Run capture-canyon-native-composition-20261022.mjs then audit-canyon-native-composition-20261022.py under tools/experiments against Vite5190.

Reviewed normal day, wide day, reverse night and wide night comparisons. Soft blending visibly reduces distant plateau mottling; normals make slopes more continuous without changing silhouettes. Nearby ripples, warm ground shadows and rock strata remain. Both refinements are useful together, not interchangeable. Existing patches remain visible in the nearer plateau rather than being completely flattened.

Original Canyon mockup was re-opened during this review. Remaining differences: shoreline too uniform, water lacks the reference's shallow-edge richness, vegetation/bank detail sparse, and distant terrain topology still visibly simplified. This is directional progress, not a claim of reference-quality completion. No buildings or authoritative terrain reshaped to imitate the image.

## Measurements

Intel UHD ANGLE D3D11, A/B/A/B, 60warmup+90samples per phase, separate GPU/cadence passes, 4-unit camera loop. No other tasks launched during sampling.

1. **Unrestricted near loop** (../canyon-native-composition-cost-20261022): fails equivalence gate. Six frames differ in combined daytime GPU pass and six in its second cadence pass; horizon installation timing shifts draw/triangle counts. Preserve raw data, reject causal material-cost interpretation. This is an unresolved streaming scheduling effect, not an optimization.
2. **Fixed-resident near loop** (../canyon-native-composition-resident-cost-20261022): syncChunks suspended identically during both measured arms, after settling. 720 valid GPU queries; exact per-frame cameras/calls/triangles. GPU day baseline9.320/combined9.504, baseline9.477/combined9.664ms. Night10.095/10.192,10.312/10.137ms. CPU differences +.100/-.104ms day,+.196/-.111ms night. Cadence16.63ms, not uncapped FPS. Isolates material cost, deliberately does not validate streaming.
3. **Wide moving view** (../canyon-native-composition-wide-cost-20261022): full equivalence gate passes,720 valid queries. GPU day7.695/7.628,7.546/9.159ms; night8.030/7.718,8.101/8.246ms. Second combined day run is1.613ms slower; retain this outlier, do not claim uniformly negligible cost. CPU2.83-3.20ms, cadence16.63ms. Longer multi-run checks remain needed.

Raw GPU validity counters and p95s in benchmark/summary JSON. Normal generation observed in capture workers: 3.00-15.70ms,103212vertices/17970unique,3622420bytes scratch per worker. These are per horizon build (including cold observations), not frame time or total worker-delivery latency. Existing normal-buffer optimization remains used.

## Recommendation

Retain combined native recipe as preferred Canyon material candidate. Visible broad improvement merits continued optimization and streaming validation; neither discard it for the slow wide pass nor claim free performance. Adaptive horizon and water-depth candidates stay separate. Remaining work includes rapid camera/chunk transitions, low/portrait, additional seeds and final six-biome review. This iteration changes evidence and selected composition, not global default behavior.
