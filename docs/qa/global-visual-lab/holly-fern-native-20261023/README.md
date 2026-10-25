# Native opt-in fern candidate

Add mangroveFerns=holly to the reviewed Mangrove lab recipe. Exact reproducible query: tools/experiments/holly-fern-native-recipe-20261023.mjs. Requires the existing continuous-grass and full moss/substrate lab options. Defaults and other biomes unchanged; approved original leaf coverage stays available by omitting the new option.

The selected radial-frond geometry, baked normal material, 30% maximum edge thinning and balanced ground filtering are now native renderer code. Uses existing occupancy/event invalidation and resident instance buffers. Medium/high use actual2048 shadows; low retains solar shadows OFF, very-low hides coverage. No simulation or navigation changes.

Six native screenshots match the previous balanced QA recipe pixel-for-pixel: three cameras, day/night, seed712,1280x720,medium,full backgrounds. No rendering material/scatter routes or runtime replacement in the new capture tool; routes only expose observation/pause/error reporting. Cameras,time,calls,triangles match. Zero GL/JS errors. Historical captured cardStudy labels predate the metadata-only audit cleanup and do not change pixels.

Validation: 11 existing coverage/ribera/material/shadow tests plus2 new fern opt-in/resource ownership tests passed. Build passed (existing large-chunk and mixed static/dynamic import warnings). Texture loading failure/cancellation disposes resolved maps; owned maps/depth materials released once on disposal; borrowed terrain maps retained. Unit quality checks do not prove full runtime quality switching or context restoration.

Not completed: active native motion/streaming, actual in-game quality switches, final combined benchmark and six-biome closure. Earlier timing applies to related QA configurations, not a measured native performance improvement. Current exact visual equivalence supports promotion to an opt-in candidate only. Source asset CC0 and attribution remain in public/assets/visual-lab/holly-fern-frond-20261023/README.md.

Reproduce: WG_CARD_TREATMENTS=cards then node tools/experiments/capture-holly-fern-native-20261023.mjs, with Vite on5190.
