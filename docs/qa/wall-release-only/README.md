# Wall stroke calculation on release

The gameplay guide now records screen coordinates and draws the Bastion-style overlay without terrain picking, module layout, collision validation or affordability calculations during a single-pointer gesture. Terrain projection and chain validation run when the pointer is released. Two-finger camera gestures retain terrain picking for camera control and cancel the drawing.

The guide can exceed the budget. At release, blocked modules are filtered before selecting the affordable valid pieces, using the current balance and preserving the 30-coin hiring reserve. Cancelled gestures never build. An entirely rejected or unaffordable completed gesture cues `ui_error` (original SFX 107) once. Partial success does not emit one error per discarded module. Reserve tutorial warnings retain their existing deduplication.

## Evidence

- 100 wall/layout/gate/gesture tests passed, including screen-space cancellation, no terrain calls before release, missing terrain, blocked-piece budget handling, mixed material gates and closure after edits.
- Three application release tests execute the actual `buildWallStroke` function with the simulation and UI audio router: entirely blocked and unaffordable gestures cue once, partial affordable success saves once without error.
- 10 UI audio tests passed, including original SFX 107 routing and separate completed failures inside the general warning debounce.
- Browser fixture: `tests/browser/wall-drawing-performance.html`. The Hold/Release buttons drive prepared pointer handlers on the native 3D world. This is controlled input, not physical phone validation. Prepared input bypasses only pointer capture because it has no OS pointer; gameplay keeps native capture.
- Held guide: 101 sampled screen positions, zero terrain picks, zero walls and unchanged 550 coins. Release: 101 terrain picks, nine paid bramble modules, 460 coins. See `held.json`, `released.json` and screenshots.
- `initial-prepared-pointer-error.json` records a rejected first fixture attempt whose invented pointer ID had no native pointer capture. The fixture was repaired and rerun in a fresh tab; this file is not passing evidence.

Scope: structural removal of work during drawing, not a measured mobile FPS guarantee. Final projection, collision checks, automatic gate selection and asset updates still incur their normal cost once on release. Missing resident terrain ends a contiguous stroke instead of bridging an unavailable interval.

Production build passed (14.82 s). Web package validation passed: 586 files, 407007413 bytes, 839 relative links and 20 runtime GLBs. A separate full `npm test` run is still pending; focused checks above are complete.
