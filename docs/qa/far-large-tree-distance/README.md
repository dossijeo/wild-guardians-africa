# Large-tree distance isolation (global preset not adopted)

Control: eight-view/eight-yaw native fixed-sun LOD2 atlas, original8-degree bake. This experiment moves the entire QA handoff from120-160m to200-240m. The analytic target remains baobab0:-6:-4, held at32.24962524394025m focus height. It is viewed at220m rather than140m; day/night pairs are exact within each pose, not across the earlier140m experiment. No shader, fog range, atlas, seed, alpha or normal-game default changes.

At220m the tree covers fewer pixels and the existing30-300m fog strongly reduces visibility of its model/sprite mismatch. This is an observation in six frozen pairs, not acceptance of orbital/lateral movement or inclined camera. Reports have errors[] and GL0. Changing the global distance also retains more3D geometry and compresses the density thinning into270-280m. That is not the final policy we want.

The blended day pose submits72draws and1,542,467triangles. Earlier140m screenshots had a different camera, residency and source and cannot serve as a performance A/B. No GPU timings or FPS improvement are claimed. Next compare a diagnostic extension confined to this large species, retaining the ordinary120-160m radius for the other species and logical terrain. Keep the extra preparation bounded and compare actual drawing costs before adopting anything.
