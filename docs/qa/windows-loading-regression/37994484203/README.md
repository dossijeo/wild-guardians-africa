# Normal Windows main run 37994484203

Source: `40a4b2716f6a9230ee05c94b51fbbad05db00ed6`.
[Original workflow](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37994484203)
is terminal **failure**. The executable and installer build/check succeeded;
the original packaged WebView2 smoke failed its unchanged readiness gate.
Native minimization/restoration was skipped, so this run provides no acceptance
for that requirement.

The original smoke artifact records `ok: false`,
`Production world did not finish loading`, and `worldWaitMs: 90159.9`.
At the final observation, the canvas was 1028 × 720, visible and focused,
displayed progress was 84, and the phase was `Preparing rendering resources`.
These presentation values do not identify the GPU or isolate the blocking work.
Storage, WebGL2, worker, the model inventory and audio checks completed; they do
not establish production-world readiness.

`desktop-smoke.json` preserves the official artifact's 3,131 bytes exactly;
`receipt.json` records its SHA-256 and artifact ID. The v7 artifact API returned
raw JSON rather than ZIP; the initial `gh run download` extraction failed, then
the same official artifact was retrieved through the API without rerunning CI.
`run.json` retains the terminal job and step results.

No timeout, loading recipe, driver flag or acceptance criterion changed. The
separate already-running observation workflow 37995161569 remains the next
source of detailed early-phase evidence; this negative does not authorize a
duplicate launch.
