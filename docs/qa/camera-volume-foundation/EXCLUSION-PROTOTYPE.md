# Model-exclusion motion prototype

The biome diagnostic (`tests/browser/african-toon.html`) now has **Protección cámara sí / no (QA)** and **Informe cámara (QA)** controls. Exclusion remains off in normal gameplay. No visual acceptance or performance benefit is claimed by this implementation step.

The optional WorldScene resolver registers individual village houses and native centers, using the previously verified local boxes and world transforms. It reuses descriptors on unchanged frames, rebuilds them on root replacement, transformation or state-envelope changes, and removes descriptors when roots disappear. Decorative meshes, crops, actors and wall pieces are not registered. Trees and model-specific visual-distance tuning remain future work.

The motion controller decelerates in a configurable soft band, sweeps a finite camera sphere to prevent tunneling and projects remaining movement along contact surfaces. It restores the intended view gradually after a constraint clears. Sphere contacts expose penetration depth for initial overlap recovery. If nearest-face recovery oscillates between overlapping houses, it searches finite exits of encountered-volume envelopes; the bounded search reports unresolved recovery explicitly instead of pretending the pose is safe.

Focus resets evaluate the new destination without sweeping through every intervening building. Raid travel uses successive motion poses. The terrain-camera cache retains the desired pose separately from the rendered correction, so repeated synchronous/idle updates do not accumulate the correction. The WorldScene resolver rechecks terrain clearance after lateral slides; conflicting terrain/building envelopes are recorded as `terrainConflict` in the diagnostic report.

## Required before enabling gameplay

- Inspect real centers and villages across cultures/biomes, including close zoom, 360° orbit, roof overflight, touch pan and simultaneous gestures. Tune margins per model/category rather than accepting the experimental uniform 0.6-unit margin.
- Verify Continue, Back, guided placement, raid travel and picking visually, plus construction, collapse, reconstruction, replacement and removal while the camera is nearby.
- Resolve any `unresolved` or `terrainConflict` reports, and examine exceptional recovery jumps. Add the requested secondary near-camera fade only if necessary.
- Include large trees with appropriate exclusion bounds; preserve closer inspection of small actors/plants.
- Compare frame cost and allocations with the prototype off/on in realistic scenes and on physical mobile devices.

The logs in this folder establish CPU geometry/controller regressions and build/package validity. They do not establish that the complete POST-JAM camera-protection requirement is fulfilled.
