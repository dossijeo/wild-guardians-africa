# Gran Rio: sampled motion inspection

Sources: existing resident-mask-validation day/night WebM recordings. Extracted 18-20 seconds at 4 fps, eight chronological panels per sheet, 480x270 each, with ffmpeg fps/scale/tile filters. No image generation, relighting or color adjustment. Video hashes and extraction settings are recorded in provenance.json.

Directly inspected both sheets and the original nine-checkpoint day contact sheet. In the sampled interval, ground coverage remains dense through the camera turn, with near trunks, intermediate vegetation and distant mountains present. No rectangular blue ground hole or complete coverage disappearance is visible in these samples. Dark under-canopy areas remain present at night; this does not justify a further global contrast increase.

The broader day contact sheet preserves vegetation and terrain across the out-and-back route. This is sparse evidence: 4 fps and downscaling cannot rule out brief LOD pops, texture shimmer, wind discontinuities or all impostor transitions. The interval is not a controlled A/B test and no performance conclusion follows from it. The original WebM files remain the authoritative temporal recordings.

Performance follow-up: six-biome-streaming-summary.json explicitly aggregates single observations taken at different times with older URLs. It is not a current-build paired benchmark. Do not reuse its numbers as proof of the final recipe cost. New controlled runs must also avoid overlapping Git maintenance or other CPU-heavy host activity.
