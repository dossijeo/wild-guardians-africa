# Navigation after physical displacement

Scope: regression introduced by the new ragdoll displacement. General farm/rendering performance is being investigated separately and is outside this follow-up.

After recovery an animal can temporarily overlap a navigation solid's footprint. `approachPath` searches in reverse, so the animal position becomes the route destination. The path finder rejects a blocked destination immediately, but target selection still enumerated thousands of crop approaches. A preflight now uses that same destination collision rule before enumerating candidates. Existing waiting/retreat movement remains responsible for leaving the overlap; this does not teleport the animal or introduce another routing system.

## Actual browser check

Restored night-31 snapshot, Intel UHD, 1600x900, native Game.tick and navigation, 400 fixed 0.05-second steps, two Attack commands with the real cooldown. Evidence: `night31-navigation-before.json` and `night31-navigation-after.json`.

- Before: at simulation time 4.65 seconds, one update made 33,982 path searches and took 1,135.6 ms after recovery. Repeated target scans also took hundreds of milliseconds.
- After: that burst no longer appeared. The largest simulation update was 249.1 ms at startup, including existing worker routes. A later ordinary route search still took 213.9 ms; this check does not establish satisfactory general performance.
- The impacted animal finished walking at (104.225, 1.775), targeting plant-58858. All physical bodies and the physics world were released. The page reported no errors and at most one visible Guardian.
- 26 targeted navigation/combat-physics tests passed, including blocked-origin rejection and the unchanged reverse-path collision rule.

Earlier legacy/full ABBA reports are retained as `night31-legacy-a.json`, `night31-full-b.json`, `night31-full-b2.json`, and `night31-legacy-a2.json`. They share an initial snapshot and command policy, but physical displacement changes subsequent targets and outcomes. They are not identical-workload rendering comparisons or proof of a global speed improvement.

Remaining limitation: this test validates one restored encounter. Collision-aware recovery beside every structure and slope still requires the wider artistic/physical validation matrix.
