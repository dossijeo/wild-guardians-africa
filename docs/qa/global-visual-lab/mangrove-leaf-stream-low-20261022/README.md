# Mangrove corrected leaves: low-quality streaming

Native renderer, seed712, low quality, 1280x720, full distant impostors/mountains and smooth transitions. Five settled checkpoints 0/96/192/96/0m by day and night. Corrected water-footprint exclusion active.

No shader/browser/GL errors, no coverage overflow. Leaf instance counts along path: 2432/4066/1864/4066/2432 in both lighting phases, all using the authored far leaf module. Counts return exactly; whole-scene pixels need not because far tree selection is stateful (see stream-audit.json). Water exclusion follows the sloping shoreline in the 192m view without the old large rectangular cut. Leaf repetition remains visible on bare brown soil; this correction does not solve every distribution/material issue.

80 observed coverage chunk preparations: mean0.514ms, p951.80ms, max2.90ms. Timing includes resident height/mask extraction, water triangle buckets and neighbor tile invalidation. It excludes initial loading and is not an isolated index benchmark or a comparison against original boxes. Work runs on chunk changes, not each frame. Resident projected water triangles range16908–45432; metadata also records bucket references, not reliable actual JS memory.

Far-transition cleanup remains valid: all12 tracked resources disposed, scene callback restored, no remaining smooth draws. Renderer resources drop165→136 geometries and100→89 textures. This is not proof against all long-session leaks.

Retain the shoreline exclusion fix. Next artistic concern is the regular appearance of leaf coverage over exposed soil, distinct from the corrected large rectangles. Reproduce with capture-mangrove-leaf-stream-low-20261022.mjs, then audit-far-transition-native-stream-20261022.py with WG_REVIEW_OUT set to this directory.
