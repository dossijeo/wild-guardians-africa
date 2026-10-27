# Readable overlay durations

Policy now uses 2 seconds for critical damage, 2.5 for spells/raid/dawn/nightfall, and 3 for victory/defeat. Existing priorities, single active/pending bounds, duplicate suppression and reduced-motion drawing remain unchanged. No simulation durations change.

Five policy/domain tests pass, covering priority replacement, rapid spells without restart/extension/queued replay, expiration, disposal and saved-state immutability. Real browser rendering over the loaded Manglares fixture passed: shield duration 2500 ms, 104 competing spell requests rejected, no pending replay, hidden at the end, no page/console errors. Screenshot inspected: cyan edge effect with readable central scene/HUD.

Browser probe constructs the production ScreenOverlays renderer over a real loaded scene; it does not validate the full GameJuice blocker/tutorial event path or every effect visually. This is functional timing and presentation evidence, not a performance benchmark. Reproduce with node tools/experiments/check-readable-overlays.mjs (Vite port 5220).
