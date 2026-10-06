# Native LOD2 moving-camera night coverage

The isolated transition fixture now derives paths and diagnostic coverage from the same transition interval used by both native color and impostor shaders. LOD2 uses 100–140 m; the original 40–60 m fixtures retain their defaults. Previously, selecting LOD2 changed the shaders but left the motion path and coverage diagnostic at 40–60 m. This correction makes the movement test exercise the intended native far band.

Paths remain deterministic and configurable: approach starts at the far endpoint, reaches the near endpoint and reverses; orbit follows the midpoint radius; lateral sweeps half the midpoint radius on both sides. The motion action disables the separate intentional distance-cutoff diagnostic so it cannot be mistaken for a gap in the model/impostor crossfade. Four camera-path unit tests pass, including the legacy paths, configured native band, rotation, height and invalid settings.

Browser evidence uses `tests/browser/far-native-transition.html?atlas-lod=2&atlas-elevation=8&camera-height=20&tree-yaw=45&night=1`, native medium quality, prepared GPU resources and the real LOD2 atlas. Each of the three 12-second simulated paths completes with native LOD2 active throughout, no unready frames, no recorded coverage gaps, no runtime errors and WebGL error 0. The console capture is empty. The endpoint screenshots and reports are retained per path.

These diagnostics verify CPU/GPU readiness and the sum of native and billboard coverage parameters. They do not measure pixel-level continuity or prove that silhouettes, angular atlas blends and baked lighting are imperceptible during motion. Full moving-camera visual evaluation, other elevations/lighting phases, production regional loading and mobile hardware remain pending.
