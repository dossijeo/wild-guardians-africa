# Conservative soft-particle depth scissor pilot

100 depth captures, no full-frame fallbacks; mean region0.1761% of target. All chunks complete with no failures. Maximum CPU frame44.47ms; slowest depth render20.685ms. One diagnostic, not AB acceptance, and no pixel equivalence readback yet. Prototype remains QA-only.

Scissor reduces raster area but does not narrow Three.js object projection/submission. The remaining CPU depth spikes justify exploring conservative region-frustum culling with identical depth coordinates, provided custom shaders and callbacks preserve equivalence. Do not adopt scissor alone or claim savings from unmatched maxima.

Bounds cover soft-particle billboard extents using a conservative local cube, with full fallback for near-plane intersections and destruction smoke. Initial two unit tests pass; orientation, camera and lifecycle validation must be broadened before any production use.
