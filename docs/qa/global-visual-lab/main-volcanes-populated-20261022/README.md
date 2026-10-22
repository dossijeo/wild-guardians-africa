# Frozen main versus populated volcanes

Baseline detached main b2497b0695218652672c805c40971ea830686e3a,Vite5191; selected experimental closure recipe,Vite5190. Load exact same native fixture from volcanes-populated-frozen-20261022, pause before first game frame, replay experimental cameras. Main checkout unchanged. Run WG_FIXTURE_BIOME=volcanes node tools/experiments/capture-main-populated-biome-20261022.mjs then python tools/experiments/compare-main-populated-biome-20261022.py volcanes.

12 pairs match camera,target,time,origin,elapsed and worker positions exactly; no recorded page/GL errors. Six final pair images show frozen main left,lab right. Model poses may include renderer-local effects; matched saved fields do not prove general gameplay equivalence. Main's far-vegetation integration differs, so this is whole-product visual evidence, not equal-workload performance benchmarking.

Normal day/night pairs inspected. Experimental ground is less uniformly blue, with ash/rock variation and clearer lit-versus-shadow relief; night is more readable than the dark baseline while retaining a cooler palette. Existing building silhouettes and crop arrangement retained. Distant bright lava remains a separate pending edge/motion check.

Retain selected art. This static assessment does not close combined low-profile cost, active play, motion or streaming requirements. No renderer changes in this capture pass.
