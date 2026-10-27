# Corrected ground-level comparison

The previous reference labelled “3D” was invalid: multiplying the card shader's angular factor by zero made `vMix` equal one, showing full impostors alongside native replacements. Its visual and performance comparisons cannot establish a 3D-versus-impostor advantage. See `../COMPARISON-CORRECTION.md`.

This corrected reference disables cards persistently inside the QA adapter update and prepares the native replacements first. Instrumentation wraps the renderer's actual `renderBufferDirect` entry point for 120 frames, counting card and standby model submissions. The capture fails if any card draw or unready positive-density replacement remains in the 3D case.

The individual `day-*/ground.png` files are lossless 1920×1080 screenshots, with renderer pixel ratio 1. No montage downsampling, image-generator editing of the screenshot, DOF or blur postprocess is applied. Existing distance fog and texture filtering remain.

All cases use seed 712, time 100, medium quality, identical deterministic ground-level pose (2.5 units above terrain/water, along a river corridor), geometry/density settings and lighting. The raster case uses new game-rendered atlases; imagegen swaps only Manglares species slot 0, preserving other species' direct raster atlas. JSON draw audits accompany every image.

Reproduce:

```
node tools/experiments/capture-ground-atlas-comparison.mjs day-3d day-raster day-imagegen
```

This is a visual comparison, not a new performance benchmark. Near trees remain real 3D in the raster and imagegen variants; impostors are restricted by the existing distance/angle policy. The 3D variant uses models at all distances.

Validated day results: 120 observed animation frames, 0 card submissions in the 3D reference; 480 in each raster/imagegen run. All 3D replacements with positive density were ready. Canvas 1920×1080 and camera/quaternion match exactly. Raster and imagegen differ in 6,570 pixels above a summed RGB difference of 30 in the 368,000-pixel tree band (1.79%); the nearby geometry is intentionally unchanged and occludes much of the distant pilot.

Pink fragments are visible in raster/imagegen and absent from the corrected all-3D reference. This is an unresolved atlas/rendering defect, not a proven unrelated model issue. The earlier reference was not suitable for attributing this defect because it also rendered cards.
