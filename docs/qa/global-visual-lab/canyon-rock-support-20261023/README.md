# Canyon rock support diagnosis

Source5072dcd5e. Same populated fixture, seed712,medium1280x720. Camera/target shifted144m along Z to the excursion's far sector; three poses/day150/night350; source placement unchanged. Six real captures and per-visible-prop measurements. Initial probe mistakenly subtracted renderOrigin after drawWorldFrame had restored world transforms; corrected and all captures regenerated. Current probe uses absolute coordinates for projection and downward raycast against resident terrain meshes. Do not use the initial invalid coordinate result.

## Finding

Instance spatial:3:-5:33,slot10, apparent left-wall rock: model bounding-box base8.959900856; actual rendered terrain ray intersection at center8.959900824 (difference3.15e-8m). Eight field samples at65% nominal radius span5.42049–13.62926m; low side3.53941m below the center base. Other rock candidates show center/terrain agreement within micro-units while sampled low sides lie2.26–3.48m below base. support-summary.json and marked image identify candidates.

This rules out a central height/pivot offset for these measured instances. It supports steep-footprint placement as the visual issue. Ring samples are a bounding approximation, **not actual mesh contact vertices**, and cannot justify moving every prop down by that amount. Some rock forms may intentionally protrude from cliffs; review their true mesh footprint before choosing a correction.

Source inspection: installed props come from spatial:* Wild Engine payload. spatial-savanna.cpp emits y=surface(center); its Canyon steep-slope rejection exempts rock type3. scene.buildPropSlot forwards those poses to createAssetLod. The old JS scatterCanyon inner-footprint lowering applies special landmarks and is not the active fix for these runtime instances. RenderOrigin restores world transforms after drawing, and measured terrain/field center heights agree. No evidence here for a rebasing or terrain-height bug.

## Next experiment

Inspect original model bottom/contact vertices transformed by instance yaw/scale; evaluate a bounded visual-only footing adjustment on the actual mesh support region. Do not mutate Wild Engine, nav/collision, logical instances, or globally apply the low ring value. Preserve silhouettes and compare shadows from multiple cameras before retaining a fix. Current pass is diagnosis only, not a correction or biome completion; no performance claim.

Reproduce: node tools/experiments/capture-canyon-rock-support-20261023.mjs with Vite5190. Metadata includes id/slot/pose/bounds/field/raycast/footprint samples/projection. All screenshot loads completed without captured errors. Production code, simulation and main untouched.
