# Native animal bound image comparison — inconclusive

2026-10-07, main parent `fbeaab8763948ef1d1afe0af393120447620d9e9`.
The weighted envelope pilot remains **OFF in gameplay**. This is diagnostic
evidence, not visual acceptance or a performance improvement claim.

The native in-app browser loaded the actual medium-quality WorldScene in
Gran Cañón/Mapungubwe (seed 712), a paid work center and five controlled animal
spawns. These are not natural campaign arrivals. Five prepared animal meshes
were compared at five horizontal camera offsets each. Terrain camera adjustment
ran before each comparison. Each row rendered native bounds twice, followed by
candidate bounds, and read all RGBA pixels at 1600×900. Mesh onBeforeRender
callbacks count actual submissions, not necessarily unobstructed visible pixels.

| Captured run | Rows | Changed native-control rows | Largest native-control difference | Changed candidate rows | Largest candidate difference |
| --- | ---: | ---: | ---: | ---: | ---: |
| Production preparation on every render | 25 | 13 | 35 pixels | 14 | 36 pixels |
| Camera and entity-sync snapshot held during comparison | 25 | 13 | 41 pixels | 15 | 31 pixels |

Both runs preserve the complete serialized logical state. Both have two rows
where candidate bounds submit an additional rhino mesh. The larger conservative
bound therefore changes actual visibility decisions; it is not just an analytic
frustum calculation. No row drops a native submitted animal in these captures.
Neither comparison passes the strict zero-different-pixels gate, and native
versus native is itself not repeatable. The differences cannot yet be attributed
to bounds, nor can similar counts be treated as equivalence. No tolerance or
pixel masking has been added to turn this into acceptance.

An initial exact vector comparison stopped at a target rounding difference of
4.440892098500626e-16 with zero eye difference. Subsequent runs record pose deltas
and reject displacement above 1e-10 world units. Pixel comparisons remain exact.
Holding camera and entity sync did not remove the native-control differences;
the source of that variability remains to be isolated. readPixels intentionally
stalls and provides no useful gameplay frame/GPU/mobile timing evidence.

## Files and reproduction

- `unheld-native-control.json`: complete first three-render control report.
- `held-snapshot-control.json`: complete snapshot-held report.
- `console.json`: native console error/warning collection, empty.
- `restored-scene.png`: scene after the sweep restored the original view. It
  does not prove all five species are distinctly visible.

Both reports were captured before adding selectable `holdSnapshot` and explicit
verdict fields to the helper. Those final reporting changes have syntax coverage;
the archived captures establish the underlying two exercised modes, not a fresh
browser run of those reporting fields.

Use the ordinary Vite server and:

`/tests/browser/animal-preload.html?biome=gran-canon&timing=1&prepare=1&plan-reserves=1&actor-profile=1&skin-envelope=1&skin-culling=1`

Append `&skin-culling-hold=1` for the second mode. The helper restores callbacks,
bounds, camera, controls and optional preparation overrides in finally blocks.
The fixture reports `ok:false` for a non-repeatable native control; do not use
this opt-in diagnostic as a general CI acceptance test yet. Native tab 659 was
closed after collecting evidence, freeing the GPU for the impostor experiment.

Six skin-envelope unit tests pass. Browser inline syntax verification passes
137 files / 136 scripts; the external helper also passes `node --check`.
Animated clip containment, all-biome rendered poses and physical mobile visual
acceptance remain separate requirements.
