# Regional water palette: first artistic comparison

72 real renderer captures, seed 712, 1280x720, medium, six biomes, day/night, three matched poses. Both variants retain QA worldbank shores and native riverBank=soil / mangroveShore=sediment options. Only regional material ink values change through an in-memory route. Production defaults are untouched. Lava and Desert receive no palette replacement.

Reproduce: `node tools/experiments/capture-biome-water-palette-20261022.mjs` with Vite on 5190, then `python tools/experiments/audit-biome-water-palette-20261022.py`. Side-by-side sheets put original left, regional right. Palette values are saved in captures.json and the script.

All 36 pairs have matching camera, target, time, draw calls and triangle counts; no browser/WebGL errors. This is a static artistic test, not a GPU/CPU benchmark. There are no added shader operations, geometry, maps or passes: only initialization constants differ. This alone does not establish measured timing equivalence.

## Assessment

Savanna loses the overly cyan pool color and looks more restrained, but the original model retains a cyan rim that needs separate investigation without changing silhouettes. Mangrove water is too gray rather than convincingly olive: do not adopt this candidate as final. The sky reflection and grading still strongly influence its appearance. Canyon gains a deeper mineral blue with a clear warm/cool relationship to the banks. Night preserves reflections, but differences in base color are less visible. River captures here use the settlement pond, not the separate channel-bank target; channel validation remains needed.

Controls are not universally pixel exact despite unchanged palette code: Desert differs by 0–3 pixels per view; Volcano night view 0 differs by 91 pixels (other five exact). Cause unisolated; matching geometry counters do not prove complete deterministic raster output. Do not attribute these control differences to the palette.

Keep these as comparison evidence, not a final approved replacement. Next iteration should lift the warm green pigment for humid water while preserving reflections and the approved moss shore. No blanket global reflection reduction and no change to lava.
