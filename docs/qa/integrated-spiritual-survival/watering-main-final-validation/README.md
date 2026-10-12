# Final PR26 acceptance and integration

Exact synchronized head `e9cd42cc402395248fb2c650d5234bcbd4a79213` passed [Validate game 38200470981](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38200470981) and [Windows 38200471004](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38200471004). PR26 was merged as `63a28057` after reviewing those final-head checks. Old standalone-head success was not used as the final merge gate.

Full CI: 4,013 tests, 4,012 pass, zero failures, one skip (the real Windows PowerShell launcher preflight on Ubuntu). Build passes in 7.29 seconds; web package passes with 722 files, 445,657,170 bytes, 860 relative links and 22 runtime GLBs. The unchanged platform-specific preflight was previously executed successfully on this Windows host after PR25. The final Windows workflow separately passes packaging and native lifecycle checks.

The clean publication checkout fast-forwarded to main `63a28057`. Approved-head ancestry and exact equality of all runtime sources were verified. Its 51 post-merge worker, watering, gate, navigation and SFX checks pass without failures/skips. Original logs and exact workflow metadata are retained with hashes in `receipt.json`.

These results integrate the technical watering cache, not the military candidate. The active candidate-4 seed-123 campaign remains on its original frozen worktree and loaded code. It was not restarted, migrated or reclassified. The separate sparse performance-preparation branch still needs its own launch/provenance review before future campaigns. This main merge does not approve the 100-night balance or physical mobile performance.
