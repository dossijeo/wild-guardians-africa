# Main candidate SFX catalogue drift

An additional read-only `audit_sfx_catalog.mjs --check` on the production-main
worker candidate `f1cda984` fails: the generated inventory no longer matches
the checked-in source hashes/locations. The original failure is preserved in
gzip; the readable copy normalizes line endings and trailing whitespace.

A preview of the same auditor was generated into an untracked directory,
redirecting only its imports/repository location and output folder. No
checked-in catalogue, runtime source or running full-suite input was changed.

Deep comparison after removing only `sourceHashes` and `line` fields is exact.
The only changed source hashes are `src/simulation/game.js` and
`src/world/navigation.js`. All 126 original byte identities, 100 assignments,
26 unassigned entries, caller selectors, context classifications, alternatives
and audible-verification flags remain unchanged. This establishes metadata
drift, not an added/removed audio binding or verified audible playback.

The full main-based regression still runs on its original source. Preserve
its eventual failures before regenerating the real inventory. Afterward,
review the actual regeneration against this preview and rerun the directed
catalogue/source-location checks. Do not present the pending suite as green
or open an approved integration PR while this known check remains stale.
