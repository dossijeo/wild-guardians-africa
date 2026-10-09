# Root review of the loading focus presentation

Reviewed feature runtime `eac5184b`, archived by the loading agent at
`089565ae` on `feature/interactive-loading-screen`. This does not merge or
approve the feature for production.

Root inspected the eight original focus-on/off JPEG captures in
`docs/qa/interactive-loading-development/` on that feature branch: day/night,
landscape/portrait. The four maize plants remain visible in each controlled
78% growth presentation. Text remains legible and the lower frame does not
cover the plants. The edge darkening is subtle, particularly in portrait;
it preserves the approved composition. These are visual fixture observations,
not evidence of real download progress, mobile input or the cinematic handoff.

Root also read `src/rendering/loading-focus-light.js` and its four directed
contracts. The implementation modifies the existing material output, shares
uniform storage, projects the focus through the current camera and fades the
effect when looking upwards. No additional render pass is introduced. This
source inspection does not establish negligible GPU cost. The same-source
amount-zero control still compiles the extra instructions: compare immutable
pre-focus V9 against the new source before making a performance claim.

The feature's original initialization regression, incremental focus cost and
full application transition gates remain open. The recorded shader warnings
and cancellation cleanup retain the scope documented in the feature's
`focus-light-review.md`.

Separately, root ran the far-world HTTP preparation verifier from
`codex/native-preparation-attribution`: exit 0, all 243 frozen response payloads,
five workers and baseline manifest/snapshot hashes verified. This verifies
inputs only; no native traveling run or frame-stability improvement is implied.

At this review C: had 39,497,728 bytes free. Large local builds, new asset
copies and asset-branch integration remain deferred for lack of space. The
responsible 100-night job in run 37895465546 was confirmed in progress; current
main validation run 37901173427 was pending and Windows run 37901173610 was in
progress. These observations do not certify a final result.
