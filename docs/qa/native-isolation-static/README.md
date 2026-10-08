# Stationary native WorldScene isolation regression

Runtime main `2ba87182`, native in-app browser tabs858/859, 2026-10-08.
Both tabs completed, disposed their contexts and were closed; tab inventory was empty.
The frozen fixtures and raw reports retain separate hashes in receipt.json.
Run `node docs/qa/native-isolation-static/verify.mjs` to check the archive.

Six new villages use seed712, medium quality, a stationary camera and paused
simulation: Sabana/Mapungubwe, Gran Río/Suajili, Gran Cañón/Musgum,
Volcanes/Etíope, Manglares/Saheliana and Desierto/Mapungubwe.
The synchronous zero-viewport/scissor isolated upload leaves all 3,240,000
framebuffer channels unchanged. Visibility, culling, shadow flags and native
shadow depth-texture identity are restored, shadows remain enabled, and logical
game state is unchanged. No reported errors; all contexts are disposed/lost.

The following ordinary frame is identical in five cases. The initial Manglares
run differs in16 channels, maximum byte delta7. This is retained as a diagnostic,
not rejected or attributed to isolation. A separate Manglares control adds an
ordinary-frame comparison before isolation: baseline and post-isolation frame
both differ in zero channels. That additional warm frame and separate context
mean this does not prove the cause of the initial variation.

Before/after PNGs are exported directly from the canvas. Pixel reads synchronize
the GPU and make these runs unsuitable for performance measurement. This covers
stationary new-village rendering only, not dense crop/worker behavior, moving
camera continuity, physical RAM/VRAM, loading responsiveness or mobile acceptance.
Production isolation and owned preparation flags remain disabled.
