# Coverage-growth isolation, dense leaves retained

Diagnostic QA only. Replace only smoothstep(.10,.48,coverageData.z) in the original leaf growth shader with 1. All accepted roots, original positional jitter, wear response, water/occupancy exclusions, geometry, lighting and LOD remain unchanged. This can enlarge leaves with low coverage; never shrinks them. No runtime edit or selected-recipe change.

Twelve real renderer captures, seed 712, media, 1280×720, day/night, normal/elevated/reverse views with full backgrounds. Comparison script verifies exact camera/target/time/origin/draw/triangle equality against reviewed-profile-20261022 and no captured errors. Static diagnostic, no performance claim.

Normal daytime pair inspected: patches remain pronounced despite removing coverage-based size variation. This rejects coverage-growth response alone as the main explanation of those broad boundaries in this scene. It does not exclude wear, placement exclusions, lighting or underlying material. Avoid warping the cover mask blindly; next isolate wear response while preserving root exclusions, then correlate boundaries with renderer inputs. Original dense selection retained. Not an artistic improvement or closure evidence.

Existing distribution dump: accepted-root wear quartiles 0/0/0.01264 (maximum .23957); cover median .79472. All cached accepted root heights 3.32599993 and slopes zero. These observations are specific to this scene and cached set, not the entire biome.

Reproduce: capture-mangrove-cover-saturation-20261022.mjs and compare-mangrove-cover-saturation-20261022.py in tools/experiments. Original left, diagnostic right in pair images.

The old ground-shadow-fill experiment was also rechecked: README and abba.json show completed historical measurements; no matching node process was live. No restart required.
