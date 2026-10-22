# Same-render persistent underlay recovery

The persistent helper now sets activation from CURRENT selection overflow plus coverage visibility/variant/quality, rather than only disabling on overflow and waiting for the next render hook to restore it. No raster or geometry changes.

Reproduce: `node tools/experiments/test-selected-grass-mask-persistent-20261022.mjs`, `node tools/experiments/capture-river-underlay-mask-persistent-first-frame-20261022.mjs`, `python tools/experiments/audit-river-underlay-mask-persistent-first-frame-20261022.py`. Vite port 5190.

Same seed 712, media renderer, 1280x720 and quality/capacity fixture as prior report, but exactly ONE explicit render after each transition. All six restored RGB frames are pixel-exact to initial coverage media: quality restoration, capacity restoration and visibility restoration in both day/night. Activation/range values match expectation; deliberately forcing capacity to one causes 11634 overflow and immediate disable, restoring capacity enables in the same render. No GL/console errors. Synthetic helper test also verifies overflow-to-zero activation recovery without waiting for another render hook.

This validates these transitions in the real renderer and corrects the prior ordering concern. It does not prove arbitrary motion is artifact-free, provide a new performance benchmark, or establish global six-biome artistic completion. Candidate remains QA-only pending native integration and parity validation.
