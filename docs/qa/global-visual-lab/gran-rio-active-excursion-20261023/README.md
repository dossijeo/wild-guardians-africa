# gran-rio: active chunk excursion

Source8c638d73d,seed712,medium,1280x720. Native selected art, full far systems enabled. Paid populated fixture, tutorial skipped only in QA save. Real simulation, wind, material clocks and normal streaming. Camera and target move144m inX and50.4m inZ and return over40wall seconds per phase; altitude follows terrain. No manual sync/reset at each frame. Night continues daytime state.

- day: 1045 observed frames; simulation advances 37.916s; clock 150.000 to 187.916; workers changed=True; 38 distinct chunk sets, counts [20, 25]; origins [[0, 0], [144, 0]]; 406 pending-background frames. Geometry range [163, 332], textures [83, 113]. [Video](day.webm), [nine checkpoints](day-contact.jpg).
- night: 944 observed frames; simulation advances 56.046s; clock 350.000 to 406.046; workers changed=True; 45 distinct chunk sets, counts [13, 26]; origins [[144, 0]]; 304 pending-background frames. Geometry range [178, 229], textures [83, 104]. [Video](night.webm), [nine checkpoints](night-contact.jpg).

No unexpected pauses, browser/GL errors or coverage overflow. Videos decode at1280x720 and exceed38s. Recording/PNG checkpoints affect timing; observed frames are not performance measurements. Resource ranges do not establish leak absence.

Both nine-image contact sheets inspected: terrain and coverage remain populated along the excursion and settlement is present on return. Cast shadows preserve volume in the forested region; obstruction transparency is visible when large trees cross the camera. No obvious missing terrain patch in the sampled images. This is not exhaustive per-frame review and pending background work occurred.

The camera stays elevated and looks mostly at nearby terrain: actual chunk traversal is demonstrated, but distant mountain silhouettes and low-angle impostor transitions are NOT closed by this evidence. Follow with a shallow-angle horizon inspection rather than calling this a complete background review. No source art or simulation changes.

Audit correction: the first verifier incorrectly required an origin change within each phase. Native RenderOrigin only recentres beyond144units and quantizes on48units. The day excursion changes origin; the night run begins already recentered and can remain within the threshold. Correct verification requires chunk changes in each phase and an observed origin change across the run. It does not force artificial rebase events or discard data.

Reproduce:
```powershell
$env:WG_FIXTURE_BIOME='gran-rio'
$env:WG_COVER_QUALITY='media'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/gran-rio-active-excursion-20261023'
node tools/experiments/capture-populated-excursion-20261023.mjs
python tools/experiments/audit-populated-excursion-20261023.py docs/qa/global-visual-lab/gran-rio-active-excursion-20261023
```
