# Next native VFX view: angle 1

Runtime is the unchanged viewer from `889c152c`; current branch `213bced2` adds archives and CPU tools only. Viewer SHA256 is `f895d3d425ffce4425bd6e2b9291c21695a74925ca9fb29a5965b071e3cdb543`. The listener remains 5284. No WebGL context is created until Load.

Reserve the window after loading 117/118 have exported, disposed and closed. This is a functional/perceptual capture, without timers. Use a fresh context for each depth mode:

1. Open `http://127.0.0.1:5284/tests/browser/frontside-maize-world.html?qaCandidate=off&qaDepth=off`.
2. Wait for the prepared status and enabled Load. Click Load and wait for WorldScene ready.
3. Click Day, Focus, then Angle **once**. The status must identify the same mature maize plant at distance 16 and angle 1; the report records theta π/2. Do not reroll target plants.
4. Click VFX. Wait for the real growth spell status, then Compare. Inspect the original/candidate pair and retain this first view, including any occlusion.
5. Click Finish and wait for saved/cleanup terminal. Copy the report and last-frame PNG to an immutable case directory before another run. Confirm context loss and close the tab.
6. Repeat the same actions in a fresh context with `qaDepth=front`. Hold that option constant across each original/candidate comparison.

If the angle-1 gameplay view is still occluded or too small to assess the target, preserve its exported result. Run a separately identified fresh diagnostic case using the same steps plus Closeup immediately after Angle. Closeup retains angle 1 and changes distance to 6. Finish and export that case separately as well. This avoids overwriting the initial exact PNG: the current viewer retains all pairs in its DOM, but the report endpoint saves only the final pair PNG. Do not claim the initial frame is archived merely because it remains in the DOM.

Expected source/derived technical witnesses follow 873/874: one original DoubleSide depth draw; candidate production array fallback draws three FrontSide standard materials in `qaDepth=off`, and three authored FrontSide depth draws in `qaDepth=front`. Both retain DoubleSide shadow materials. Confirm actual target/spell IDs, active effects, unchanged paired logical state/cameras, effective depth draw materials and cleanup; these expectations are checks, not substitutes for the report.

Review leaf form, recognizable maize, growth spell layering and obvious missing/deformed surfaces at gameplay scale, using closeup as supplementary diagnosis. Pixel differences remain diagnostic under policy 3. Occlusion is inconclusive, and no static still establishes animation continuity, completed harvest, category acceptance or net World GPU benefit.
