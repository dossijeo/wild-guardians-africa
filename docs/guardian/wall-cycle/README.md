# Wall-adjacent Attack trial

The combat fixture now exposes `Medir caída contra muralla`. It creates a legal thorn wall through Game.placeStructure, places the selected animal on its approach side, aims Attack toward it and runs Game.tick with WorldScene for 12 simulated seconds. The wall receives 10000 HP for this QA case and the initial animal swing is delayed so the obstacle survives. These overrides do not change production balance. Physics contact counts include all nearby structures (wall and center), not exclusively the wall.

Executed with the catalog hyena: 38 sampled structure contact pairs, phases falling → rolling → recovering → attacking, no runtime errors, no roll timeout, final down count zero and zero retained physical bodies. The roll finished in 0.733 s at angular error 0.344. Full diagnostic DOM output is run.json. The recovered.png screenshot shows the recovered animal beside the wall and nearby center.

The initial attempted measurement was invalid: a fixture edit landed in the stress handler instead of the measurement setup, so it ran the ordinary open-ground cycle. That edit was corrected before this recorded run; no evidence from the invalid run is used here.

This is runtime lifecycle/contact evidence with sampled screenshots, not a complete visual collision approval. No recording of the full fall was captured in this run. Skin penetration, recovery displacement near corners, other species, slopes and destruction during the fall remain to be visually inspected. The fixture uses legacyNavigation, not a full campaign acceptance run. Syntax and whitespace checks passed.


## Recorded cycle

`Grabar caida contra muralla` records the same controlled scenario through the existing local video receiver. `hyena-wall.mp4` contains the full canvas sequence, without audio. `recorded-run.json` is its separate runtime report: 12.023 simulation seconds, 244 measured frames, zero hidden frames/errors, 33 sampled structure contacts, maximum one Guardian, zero final down actors/bodies. The roll completed in 0.900 s without timeout. Physics manager CPU p95 was 4.145 ms in this recording; this is not a paired performance comparison.

Inspected `sequence.jpg` at 1 frame/s and `recovery-detail.jpg` at 3 frames/s over the get-up interval. The animal falls on the approach side, rolls supine, gets up and resumes attacking the intact wall. No gross passage through the wall is visible in these samples. Frames between samples were not individually inspected. Small skin penetrations and the precise support/contact impression remain outside this camera/sample coverage; this is not approval of all obstacles, species or angles. The video is retained for continuous playback review.


## Buffalo day/night

Two additional catalog-buffalo runs completed through falling, rolling, authored recovery and resumed attacks. Night: 49 sampled structure contacts, roll 0.15 s, no timeout, sampled recovery clearance 0.010–0.020 m. Day: 45 sampled structure contacts. Both report zero final down actors and no runtime errors. Full videos and separate runtime JSON are retained. Contact counts include neighboring structures and are not penetration-depth measurements.

The wall recorder now honors recoveryDay=1 after creating the wall; the wall-attack setup previously forced night. Inspected the night sequence and a daylight detail sheet at 1 frame/s. The larger body remains on the approach side in these samples and resumes attacking. The dark coat and lack of a strong contact shadow still make support harder to judge; numerical support alone does not settle that artistic concern. Some daylight detail tiles crop the outer limb; full video retains the complete view. Full-frame per-triangle inspection and the remaining scenario matrix are not claimed. Videos contain no audio.


## Low-angle support inspection

The fixture supports wallLow=1 for a lower camera while retaining the same wall encounter. buffalo-low.mp4/json and its 1 Hz contact sheet document a further completed cycle with no runtime errors. Source inspection confirms animal-preload enables casting/receiving shadows and shadow-cache includes skeleton bone world matrices; no shadow-system modification was justified by this check.

The prior daylight trace separates foot support from the minimum body sample: during the 0.65 s entry blend the foot minimum peaks at 0.108 m; after entry the supine feet settle near 0.02 m, and the final standing support is 0.01 m. This distinguishes limb lift from whole-body clearance, without certifying every vertex. The low view shows the body settling and rising beside the wall in sampled frames. The dark silhouette remains difficult to read against the center shadow; no global lighting or material changes were made on speculative grounds. Remaining species/scenario coverage and continuous artistic review remain open.
