# Completion remains unproven

The current goal covers integration and residual full-game fluency, not simply a successful local optimization.

- Integration: PR216 and PR218 merge records and CI evidence are retained in main-integration-20261027 and NATIVE-LIFECYCLE.md. Later experiments are not implicitly covered by those checks.
- Accepted native optimization: full native/concurrency suite, package lifecycle, browser fallback and Windows distribution evidence recorded for the merged exact head. Preserve these invariants in further work.
- Current experiment: cached-distance logical standby selection. Differential correctness passes; real-game performance acceptance is pending. Regional index and unused-water fallback were rejected and restored.
- Performance scope: recent controlled runs cover active agricultural Manglares streaming on this Intel UHD host. They do not establish final fluency for all six biomes, both modest quality settings, day/night, quality changes, spell interaction and world exit/restart. Audit existing artifacts by exact implementation and conditions before claiming coverage; obtain missing final-state runs.
- Quality-cycle diagnostics contain synchronous correctness checks and compiler warnings. Separate those costs from normal presentation. Do not claim all warnings resolved or diagnostic P99 equivalent to normal play.
- Art: preserve ferns, fixed512 ground cache, trees/atlases and lighting. Differential selection tests do not replace scene visual validation for an accepted renderer change.
- Postmerge requests remain pending: ground the menu totem while preserving far parallax; fullscreen overlays 2–3 seconds without stacking. Character LOD remains parked.
- Preserve seven preexisting dirty files; stage only owned changes. Do not merge experimental candidates solely because unit tests pass.

After closing the current candidate, prioritize final-state coverage and remaining confirmed large contributors rather than an indefinite series of small isolated tweaks.
