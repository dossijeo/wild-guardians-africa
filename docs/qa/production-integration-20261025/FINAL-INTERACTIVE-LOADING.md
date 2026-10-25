# Interactive loading and final NSIS package

The second final desktop build completed successfully, exit 0: `.codex-qa/final-pruned-desktop-build-r2.log`. NSIS installer: 403758858 bytes (385.05 MiB). This supersedes the failed first packaging attempt, whose Windows file-lock cause remains documented. Same reduced 973-file production package, no DOF. Successful packaging is separate from the earlier native WebView2 runtime smoke.

`final-loading-plant.json`: real Chrome, packaged Manglares new game, no source interception or graphical QA flags. A browser pointer click at (850,450) during loading was followed by normal world readiness. No page errors or missing requests. The before screenshot shows four maize plants at 39%; the after screenshot shows a fifth on the right at 55%. The screenshots were visually inspected. This verifies the visible planting response through the real pointer path; it is not an authoritative simulation-state equality test or performance benchmark.

The next lighting A/B/A/B is deliberately separate, after local builds/browser QA finished, with an additional 15000 ms settling period before each measurement. Previous noisy results remain retained; no performance conclusion is asserted in this note.
