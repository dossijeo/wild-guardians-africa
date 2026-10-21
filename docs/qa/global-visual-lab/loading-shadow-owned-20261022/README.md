# Scene-owned asset shadow isolation

Native change: installAssetShadows accepts an optional owner scene. WorldScene supplies its scene; foreign presentation scenes delegate directly without enumerating world chunks or adding asset proxies. The world hook remains installed. Legacy unscoped callers retain their existing behaviour. Building destruction auxiliary passes already disable shadow rendering.

This removes the QA workaround that permanently called world.releaseAssetShadows before loading-garden shadows. The replacement helper installs only the garden's native-shadow wrapper and releases it when the diorama is disposed.

Validation: 31 tests pass across asset-shadows, asset-groups, shadow-cache and render-origin-window, including a new two-scene test proving foreign scenes do not read chunks and normal world proxies still render afterwards. Eight real browser captures exactly match the preceding loading-day-air images (equivalence.json): same 6 cached-shadow draws / 16002 triangles and no GL/JS errors. Duplicate PNGs are reproducible and not committed; canonical matching captures are in ../loading-day-air-20261022.

After disposing the actual diorama, the real world renderer resumes successfully: 19 asset-shadow draws / 643770 asset-shadow triangles, GL error 0, world not disposed. See handoff.json and world-after-handoff.png. This verifies renderer ownership and release in a prepared real scene; it is not yet an integrated menu-to-loading-to-game test of the full new art direction.

Reproduce: node tools/experiments/capture-loading-shadow-owned-20261022.mjs (Vite port 5190). Tests: node --test tests/asset-shadows.test.js tests/asset-groups.test.js tests/shadow-cache.test.js tests/render-origin-window.test.js.

No added draw or geometry in the owner scene, no simulation change. Remaining integration work includes moving QA art/material setup into an opt-in native presentation, preserving cleanup on cancellation and benchmarking moving-light shadow updates. This commit does not claim those are complete.
