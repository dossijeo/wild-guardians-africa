# Integrated water regression checks

Full suite at 88aa27f12: 5040 tests, 4977 passed, 1 failed, 62 skipped, duration 475809 ms. Raw tests.log retained. The sole failure was tests/sfx-catalog-audit.test.js: stale inventory. Regeneration changes only the scene.js source hash; no sound assignments, bytes or other inventory content changed. The focused audit suite then passed 3/3. This is not a claim that the original full run passed.

Additional checks after regeneration:
- verify:browser-syntax: exit 0, 183 files / 178 scripts, no failures.
- test:web-package: exit 0, 989 files / 484462140 bytes, 855 relative links, 17 runtime GLBs; excluded unused worker labs, original GLBs, demo village and superseded ground duplicates.

No runtime changes made to resolve this failure. Current-build six-biome visual/runtime coverage and final remote integration checks remain necessary. The Manglares ABAB shows smaller water preparation units and increased completed demands, but does not establish improved full-frame percentiles.
