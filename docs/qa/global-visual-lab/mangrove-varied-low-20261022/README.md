# Varied Mangrove coverage: low-profile paired check

Original and varied native distributions, same medium-approved recipe otherwise, quality=baja, seed712,1280x720, three identical camera/target/time poses day/night. Twelve frames per option, no recorded page/GL errors or capacity overflow. Low profile correctly uses zero near instances. Paired final draw counts identical; varied accepted far counts +3/+2/+1 modules at the three poses, corresponding +72/+48/+24 triangles. Positions change around unchanged exclusions, not nominal density increase.

Normal daytime pair visually inspected: varied size/position reduces dark clustered rows and blends more gently with moss. Still broad green homogeneity. Lower profile lacks cast shadows and has fewer leaves by existing design; do not confuse this with variant regression. Candidate remains optional, not closure approval. Night/elevated/reverse supplied; detailed visual review not claimed. No low-profile GPU timing or FPS claim from this static check.

Reproduce in PowerShell:
```
$env:WG_COVER_QUALITY='baja'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-varied-low-20261022'
node tools/experiments/capture-mangrove-varied-native-20261022.mjs
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-original-low-control-20261022'
node tools/experiments/capture-reviewed-profile-20261022.mjs
```
Vite5190. comparison.json records workload deltas; comparison-day/night-0/1/2.jpg show original left, varied right, uncropped at equal scale with labels. Source controls in sibling original-low-control directory.
