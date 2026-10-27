# Mangrove shallow shore: uniform-band trial

Reproduce `node tools/experiments/capture-mangrove-bank-shallow-review-20261022.mjs`, Vite port 5190. Native baseline versus QA shallow band, seed 712, media, 1280x720, bank target (120,88), three cameras, day/night. Twelve real images; all six pairs have exact camera/time/calls/triangles and no captured errors.

Implementation samples existing field.waterInfo shore distance once at existing water vertices during chunk creation, including horizon. One float vertex attribute is interpolated; fragment color blends toward subdued green-brown over 2.2 shore units. No geometry, models, draw calls, passes or textures added. This is shoreline distance, NOT true optical water depth or ground reconstruction. Its interpolation inherits existing water tessellation.

Day/night game-camera images were individually inspected against native frames. The band softens the hard blue/green junction, but reads as a continuous dark blurred outline. At night it deepens the already uniform boundary rather than conveying wet sediment or irregular shallow shelves. It does not satisfy the reference direction.

Decision: do not integrate this variant. Rejected for artistic insufficiency, not performance. CPU/GPU benchmark deferred because this visual form is not a candidate; identical draw/triangle counters are not proof of zero cost. Next investigate localized irregular shallow sediment and land-side wetness using existing surface data, keeping authoritative geometry and original models unchanged. No global quality-completion claim.
