# Combined smaller-tree profile: ground controls, source d8f19970

Sabana/Mapungubwe/media, small-tree90–120m, authored large-tree200–240m with bounded size-preload exception; fixed eye143.206906/110.252348/-46.973627, focus-76.793094/22.078298/-46.973627. Native day/night views share camera and use phase0/1.

The no-far-ground control is rejected: it exposes an empty blue area under the distant sprites. NativeHorizon.update intentionally creates extended terrain only in Canyons and Desert, so there is no Sabana native horizon to preserve. This is not proof that attachment hid an existing Sabana mesh.

The existing native-material far ground (32m mesh, mapped detail disabled, native biome tiles/toon retained) gives a closer ground tone than the mapped-average Basic pilot, but its per-vertex water interpolation loses stretches of the river and its coarse/native border shows a thin blue seam. These are pending coverage defects. Native ground preserves tree readiness in the held view but does not by itself accept transient seams or the dithered silhouettes.

GL0/errors[] for both phase reports. Console records two known ANGLE f_environment4 potentially-uninitialized warnings; no causal rendering claim. No timings: the parent's full Node suite was active. This control guides a separate mask-resolution and edge-matching fix; it is not an integration acceptance.
