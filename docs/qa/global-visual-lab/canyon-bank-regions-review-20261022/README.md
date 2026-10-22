# Canyon bank-region vegetation pilot

Reproduce: Vite5190, `node tools/experiments/capture-canyon-bank-regions-20261022.mjs`. Real seed712/media/1280x720 campaign, three matched cameras, day/night. Control restored archived Blender scatter; candidate reuses exactly the same mesh/material and occupancy/water/slope/wear checks. Candidate probability uses waterInfo.shore with Gaussian width5.5 and deterministic 11-unit region selection, leaving gaps. No authoritative world changes.

All six paired views inspected, no captured errors; pose/time identical. Candidate317 resident instances versus249-255; same draw calls (40/36/33 for views), +6,448 to7,072 submitted triangles. Better concentration around banks is visible, particularly in normal/reverse view. Still isolated thin blades, not the mockup's vegetation masses. Keep candidate as QA groundwork, not production quality. Improve authored low vegetation's collective mass rather than indiscriminately increasing density. Current hard region boundaries need continuous-motion assessment before adoption.

Paired GPU/CPU experiment is in canyon-bank-regions-cost-20261022. This is an artistic-cost test with intentionally different instance counts, not a claim of equivalent-work optimization. Production recipe unchanged.
