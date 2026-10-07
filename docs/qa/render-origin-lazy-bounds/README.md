# Lazy bounds collection at the default render origin

WorldScene previously collected material clipping/fluid bounds and terrain /
horizon rectangles before calling `withRenderOrigin`, even though that helper
immediately draws without any adjustment at origin `(0,0)`. Those collections
now use providers resolved only after the helper's nonzero-origin check.

This eliminates the material scan and terrain/horizon map/filter allocations
at the default origin. It does not cache metadata: a nonzero origin resolves
the latest vectors every frame, including replacements without scene changes.
Existing eager-array callers remain supported. All camera/scene transforms and
bounds restoration, including exceptions, retain the existing behavior.

13 directed coordinate/window/registry tests pass, including distant Float32
precision, duplicate bound references, new vector identities between frames,
provider nonexecution at zero origin and restoration after a throwing draw.
Material-registry and VFX-origin regressions also pass. Production build and
browser-script syntax checks pass. SFX audit is regenerated only because its
source hash includes scene.js; sound assignments remain 95/31.

No browser/GPU or physical-mobile frametime benefit is asserted. At nonzero
origins the collections still run; this does not remove the expensive scene
matrix updates required during recentering or replace the pending GPU work.
