# Initial streaming lifecycle run — assertion reference corrected

The 192m outward/return path generated nine regions per species across day/night without browser or WebGL errors. All 12 tracked smooth resources were disposed, no smooth meshes remained, and renderer memory dropped from 179 geometries/102 textures to 150/91 after far-owner disposal.

The harness exited with a failed hook-restoration assertion because it captured `Scene.onBeforeRender` immediately after creating the scene, before continuous grass installs its own hook. That is not the hook which the smooth transition owner must restore. The corrected harness observes the actual predecessor at smooth-owner registration without changing its behavior. Its new run is stored separately in `far-transition-native-stream-verified-20261022`; these original results remain intact.

Return images are not exact: 10556 daytime and 8589 nighttime pixels differ, with changed tree draw/triangle counts. Difference sheets show distant-tree changes. This run proves region replacement occurred, not deterministic return representation or absence of all leaks. No timing or FPS conclusion is justified. `checkpointMs` includes loading and settling.
