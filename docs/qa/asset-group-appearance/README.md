# Native asset-group allocations at first appearance

Runtime `5a1ba787`, unchanged. The QA-only `groups-profile=1` option records
prepare/retire calls during the first two appearance renders. It preserves
arguments, receiver, results, errors and ownership of the wrapped methods.
It does not change capacities, packing, geometry, shaders or simulation.

Gran Río/Musgum, seed712, high quality, drawing buffer1280×720, one controlled
buffalo spawn. This appearance-only case has a paid centre but **no seed or
initial hiring**; it is distinct from the earlier first-contact case. No
simulation ticks, contact, workers, full night or physical mobile acceptance
are claimed. CPU campaigns44164/49032 were confirmed live.

| Observed | First render | Second render |
| --- | ---: | ---: |
| Group prepare calls | 58 | 58 |
| New group meshes | 21 | 0 |
| First allocation of a key | 6 | 0 |
| Capacity increases | 13 | 0 |
| Capacity decreases | 2 | 0 |
| Retire calls | 18 | 0 |
| GL bufferData calls, whole frame | 171 | 0 |
| GL bufferSubData calls, whole frame | 59 | 0 |
| Compile/link calls | 0 / 0 | 0 / 0 |
| Instrumented CPU render time | 38.7ms | 16.2ms |

The frame prepares 147,008 bytes of instance-array backing stores (summed once
per prepare). This excludes vertex attributes, textures, driver/program memory
and does not measure physical GPU allocation. Retirement includes three keys
which leave the visible grouping as well as15 capacity changes. The whole-frame
GL calls cannot all be attributed to these groups with this observer.

This rules out shrink avoidance as a sufficient explanation for this specific
appearance: only2 of15 resized groups shrink. Next candidate: transfer ownership
of immutable static attribute identities across a color-group capacity resize,
while replacing/discarding only visibility and instance buffers. Validate native
matrices/coverage, resource lifetime, draw counts and images, then measure actual
submissions before adopting it. No such optimization is active in this receipt.
The timing is a single inclusive CPU diagnosis, not an A/B benchmark or GPU gain.

12 directed probe/CPU/GL observer tests and the focused browser-script syntax
check passed. Reports, screenshot, exact fixture/probe/runtime source snapshots,
test log and hashes are retained. Default gameplay does not import this observer;
the existing QA fixture installs it only with the explicit option and timing=1.

Reproduce `/tests/browser/animal-preload.html?biome=gran-rio&culture=musgum&quality=alta&attack-species=buffalo&timing=1&appearance-profile=1&groups-profile=1`.
