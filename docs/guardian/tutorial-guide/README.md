# Tutorial guided by the 3D Guardian

The tutorial no longer displays either HUD or world pointing hand sprites. The existing 3D portrait floats toward the selected UI control and aims its nearest arm at the button. World hints reuse the single summons actor, face the camera, point toward the suggested site, and retain the cloth, blink and narration layers. Spells take priority over guidance; the portrait is hidden and its renderer skipped while the world body is visible.

Guided construction/crop panels preserve the current tutorial narration. Closing unrelated surfaces retains the normal interruption behavior. The guide can remain visible after the voice ends until the required action is completed.

The first center may occupy any otherwise valid location within 32 m of the village entrance. For authored layouts whose nearest buildable plateau is farther away, the radius expands to the suggested site's distance plus 8 m. Terrain, footprint, access and price checks remain authoritative. Subsequent centers are unrestricted by this tutorial rule.

## Executed validation

- Real application through `tests/browser/mobile-first-day.html`, using an isolated save database: HUD pointing, world pointing, no legacy hands, one world body and hidden portrait.
- Built the first center at (84.8222873, -0.8885311), approximately 2.03 m from the suggested (83, 0). The tutorial advanced to planting. An earlier invalid terrain footprint was correctly rejected.
- Continued the saved world, selected millet, inspected the enlarged world guide and camera-facing pose.
- `test:playable`: 216/216 pass, including canyon opening layouts after adapting the neighborhood radius.
- Browser script syntax: 181 scripts across 190 files, no failures.
- Focused placement/tutorial/audio tests passed. Native placement now uses the supported `nav.placement` footprint API rather than an unsupported arbitrary animal radius.

Evidence: `game-hud.png`, `game-world.png`, `game-center-placed.png`, and the three JSON snapshots. `game-world-before.png` records the smaller first iteration; `hud-build.png` and `hud-grow.png` are isolated UI fixture captures.

## Limits of this validation

The captures do not prove every language, mobile viewport, camera orientation or guide-to-spell interruption combination. The final narration-preservation adjustment was compiled but audio continuity through panel changes has not been separately recorded. The gesture uses the existing arm/forearm/hand bones, without a separately articulated pointing finger. This report does not claim completion of the broader animal-expression/ragdoll project or resolution of baseline engine performance.

## Guide / spell handoff regression

An automated scene-level test exercises guidance, a Multiply cast, immediate return to guidance, hint removal and game completion. It verifies reuse of the same body, active-count continuity, removal of spell VFX, scale restoration and neutral material tint. This caught and fixed a retained purple tint after Multiply. All five singleton/consecutive-projectile tests pass. This is an automated lifecycle check, not additional visual footage or audio-continuity evidence.
