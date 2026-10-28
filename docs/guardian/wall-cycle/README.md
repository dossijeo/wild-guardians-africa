# Wall-adjacent Attack trial

The combat fixture now exposes `Medir caída contra muralla`. It creates a legal thorn wall through Game.placeStructure, places the selected animal on its approach side, aims Attack toward it and runs Game.tick with WorldScene for 12 simulated seconds. The wall receives 10000 HP for this QA case and the initial animal swing is delayed so the obstacle survives. These overrides do not change production balance. Physics contact counts include all nearby structures (wall and center), not exclusively the wall.

Executed with the catalog hyena: 38 sampled structure contact pairs, phases falling → rolling → recovering → attacking, no runtime errors, no roll timeout, final down count zero and zero retained physical bodies. The roll finished in 0.733 s at angular error 0.344. Full diagnostic DOM output is run.json. The recovered.png screenshot shows the recovered animal beside the wall and nearby center.

The initial attempted measurement was invalid: a fixture edit landed in the stress handler instead of the measurement setup, so it ran the ordinary open-ground cycle. That edit was corrected before this recorded run; no evidence from the invalid run is used here.

This is runtime lifecycle/contact evidence with sampled screenshots, not a complete visual collision approval. No recording of the full fall was captured in this run. Skin penetration, recovery displacement near corners, other species, slopes and destruction during the fall remain to be visually inspected. The fixture uses legacyNavigation, not a full campaign acceptance run. Syntax and whitespace checks passed.
