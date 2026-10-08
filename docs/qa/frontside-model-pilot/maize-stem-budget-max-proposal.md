# Maximum stem retention under the fixed bilateral triangle budget

New offline proposal only; no runtime import, image acceptance or GPU timings.
The .75 DoubleSide quality rejection remains archived without reinterpretation.
This proposal takes no images or heldout views as input. Its face count follows
the existing +10% whole-state triangle gate, before any new quality screen:

```
maximumStem = floor((4935 * 1.10 - 4111) / 2) = 658
wholeBilateral = 4111 + 2 * 658 = 5427 triangles (+9.9696%)
```

The Blender collapse ratio is658/824=.7985436893203883. It retains more stem
faces than the rejected .75 proposal and supplies a geometric reverse for every
derived stem face in the eventual resource estimate; no selected backface masks.
Original soil/leaf POSITION/NORMAL/UV corner bits and source face labels are
asserted unchanged. New stem face identities are explicitly derived, not original
face IDs; full bridge correspondences are still unbuilt and unvalidated.

Decoded shared state estimate is321042bytes (+1.254%), including P/N/UV and
forward/reverse indices. Native forward geometry has4769triangles. These estimates
exclude category/bridge lanes, material/GPU memory, web compression, group/draw
overheads and actual vertex shader invocation reuse. They are not performance
results. The candidate must first pass originalDouble versus derivedDouble gates;
only then may culling, fresh independent all-view states, actual shadows and net
GPU benefit be investigated.

Maximum sampled nearest-source distance is.02262997 model units, mean.00086164,
2632corner/centroid samples. This still presents a substantial geometric quality
risk; it is not a bidirectional bound, UV/map bound or continuous growth proof.
No thresholds were changed to accommodate the older rejected proposal.

Reproduce separately from the frozen .75 recipe:

```powershell
& '.cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe' --background --factory-startup --python tools/frontside_blender_stem_reduction.py -- --budget-max
```

Receipt maize-blender-stem-budget-max-diagnostic.json; generated corner archive
SHA256 cb6b139a611ea35f6cbf5a5c80c2fc9d1fed8999ec477b70b68e560a3586dbc9.
This mode writes a separate receipt/archive. Default ratio .75/.6/.5/.4 payloads
and their original ordering are preserved. Native fixture is not wired to this
proposal, while worker source-only diagnosis remains frozen at3cb4b1df.
