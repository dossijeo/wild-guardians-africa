# Mangrove optical-depth color trial

QA-only: use the existing shore height map to blend olive shallow water toward dark green interior before lighting/reflections. Smooth transition .10–.85 optical depth. One extra map sample in the lighting function; no new map, geometry or draw. Existing sediment compositing preserved over the varying base. Production unchanged.

Twelve real captures, seed 712, medium 1280x720, three settled poses day/night; equal cameras/time/calls/triangles and no browser/WebGL errors. Reflections stand out more, but the water becomes nearly uniformly dark blue. This is mainly a palette change, not the desired varied depth structure. The wetland-derived optical depth reaches the dark endpoint across much of the interior, limiting its usefulness as a bathymetric proxy. It is not physical underwater depth.

Decision: do not adopt this candidate. Preserve approved moss/shore and current regional palette. Do not spend the additional texture sample for a change that does not meet the artistic goal. Next investigate the spatial distribution available in the water mask and bank distance before further depth shading; avoid claiming physically based absorption or inventing authoritative terrain changes. No GPU benchmark was run because the visual gate failed.

Reproduce Vite 5190, `node tools/experiments/capture-mangrove-water-depth-20261022.mjs`, then `python tools/experiments/audit-mangrove-water-depth-20261022.py`. Side-by-side sheets retain the rejected trial for review.
