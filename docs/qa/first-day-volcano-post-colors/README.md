# First-day UI review after building color installation

Reviewed locally on 2026-10-07 against main `50b6dc18`, Vite port 5181. Ordinary new-game UI, Volcanes / Mapungubwe; generated seed was not recorded. Desktop 1280×720 and browser viewport 844×390, not a physical mobile device.

Observed: loading-only DOM before the gameplay HUD; placement of one work centre on safe ground; one millet planted; automatic mandatory hiring with all four portraits; hiring two women for 70 coins; tutorial message auto-hide; cultivation prices ascending (5, 6, 8, 10, 12, 18, 100, 150). HUD artwork and portraits were visually present. `loading-or-first-frame.jpg` captures the first world frame, not the loading screen.

The two crop image JSON snapshots contain the same eight stable URLs, all complete with natural dimensions 192×192 on both openings. `crops-landscape.png` shows the reopened panel at night, when planting controls are disabled. Rebuilding image elements does not establish a network download: no transfer-size or itch.io cache-header measurement was made. Portraits were confirmed loaded on the first hiring opening, not measured across repeated hiring openings.

Saved screenshots were visually inspected. Console capture contains no errors and one ANGLE shader warning about potentially uninitialized `f_environment4`. GL error state was not read. The responsive viewport override was reset and the test tab closed afterwards.

This is bounded UI evidence, not complete first-day physical-mobile, worker-routing, shoreline/lava placement, raid, cache-network, performance, or 100-night acceptance.
