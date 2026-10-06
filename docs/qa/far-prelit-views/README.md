# Prelit atlas view checks

The native transition fixture now accepts camera-height (4 to 40), camera-yaw, tree-yaw and night (0 to 1). Defaults preserve the original view. Both native model origin and impostor use the same authored foot anchor transformed by tree yaw. An initial diagnostic run exposed an incorrect fixed zero yaw in fixture modelOrigin; this was corrected and all final captures repeated. No gameplay code changed.

Each case captures native, impostor, background and mixed after GPU completion AND readiness fade reaching one. At horizontal distance 50, native mixed coverage is 0.5, LOD1 packed and GPU covered. Console warning/error logs and WebGL errors are empty.

- high-night: height 20, camera yaw 45, tree yaw 45, night 1. RGB mask IoU 88.12% (threshold zero), 82.62% (threshold eight).
- mid-phase: height 10, camera yaw 90, tree yaw 22.5, night 0.5. RGB mask IoU 86.11% and 82.99% respectively. This exercises interpolation between angular views, world-yaw rows and the two lighting endpoints.

Both use atlas-lod=1&atlas-elevation=8 and the existing two prelit textures. Native and billboard bases remain aligned. The differences demonstrate remaining perspective/angle interpolation limitations; fixed-sun baking alone does not establish a visually seamless crossfade. Masks include shading, holes and antialias, not geometry alone. No mobile performance or perceptual success claim is made.

Reproduce with tests/browser/far-native-transition.html?atlas-lod=1&atlas-elevation=8&camera-height=20&camera-yaw=45&tree-yaw=45&night=1 (or height=10, camera-yaw=90, tree-yaw=22.5, night=0.5). Select distance 50 then Prepare GPU and wait for ready=1 before selecting capture modes.

Run tools/check_far_silhouette.py with either capture folder and --output summary.json. The verifier now requires matching view settings and atlas elevation across captures. It still requires fully ready GPU coverage and matching expected native visibility.

Next: assess motion and fog at realistic far distances before adding atlas views or integrating all biomes. Retain this evidence when deciding the supported camera elevation range.
