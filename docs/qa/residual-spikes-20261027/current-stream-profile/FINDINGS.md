# Current production streaming attribution

Completed one40-second144-unit excursion with active agricultural Manglares simulation, no spell, current production renderer. CPU sampling and phase instrumentation enabled: diagnostic attribution only, not performance acceptance. No page errors and no recorded program waits. Full profile wall41.753s.

Top updateMatrixWorld self samples936.486ms. Nearest nonrecursive caller estimates: withRenderOrigin412.909ms; Three WebGLRenderer.render316.884ms; NativeAssetGroups.update182.023ms. Inclusive/self figures must not be summed indiscriminately. Other significant self samples: smooth-far-transitions prepare418.402ms; shadow-cache put420.946ms and attribute311.069ms; updateAssetLods277.438ms.

Next structural hypothesis: render-origin synchronization and automatic Three scene synchronization may overlap within the same draw transaction. Audit matrix ownership and mutations between depth/color/smoke before attempting consolidation. Preserve restored world matrices for input/raycast, callbacks, moving actors and detached shadows. Do not globally freeze scene transforms. No runtime change yet. Shadow packing/bypass and regional/offscreen particle experiments remain rejected; this is not evidence to repeat them.
