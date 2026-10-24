# Combined five-biome capture review

Completed: 60 real captures, seed712, medium1280x720, warmup/review x day/night x three cameras for Sabana, Gran Rio, Desert, Volcanoes and Grand Canyon. All recorded frames have zero GL errors, no page errors, enabled far background, ready adapters and visible mountain backdrop. Mangroves are recorded separately in ../reviewed-profile-20261022. No rendering defaults changed.

Reproduce with the development server on port5190:
```powershell
$env:WG_REVIEW_BIOMES='sabana,gran-rio,desierto,volcanes,gran-canon'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/reviewed-five-biomes-20261022'
node tools/experiments/capture-reviewed-profile-20261022.mjs
```

Visual inspection covered full-resolution reverse daytime views for Sabana, Gran Rio and Grand Canyon, plus a day/night overview for the first four biomes. This is not exhaustive inspection of all 60 images. partial-overview.jpg preserves aspect ratio and covers four biomes only.

Findings:
- Sabana: continuous dry-grass foreground, warm palette and tree shadow contrast retained; detail diminishes toward background.
- Gran Rio: dense green coverage and distinct soil/water margin; distant terrain is simpler.
- Desert: overview retains warm dune shading and readable settlement; no water is visible in this camera, so it cannot certify oasis edges.
- Volcanoes: overview retains dark substrate and luminous lava contrast day/night; small overview is insufficient to approve shoreline detail.
- Grand Canyon: warm stratification and large shadow volumes remain visible. Reverse daytime view clearly exposes sawtooth water edges and repetitive reflection streaks. Next targeted water iteration should address these without changing authoritative terrain or water boundaries.

No timing claim: static captures do not establish streaming stability, resource lifetime or complete visual parity. Existing per-feature benchmarks remain separate. Source diagnosis of simplified far ground is in REVIEW-IN-PROGRESS.md; the file records preliminary observations, followed by the correction about water-mask versus terrestrial color sampling.
