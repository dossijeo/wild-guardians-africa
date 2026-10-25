# Final reduced package: native smoke and itch archive

Runtime/source selection: e74b79b1d; subsequent 21f8d41ab contains Library evidence only. Final native executable SHA256: 6501f263d4a4d38adbdc9e582486000171a5b4e755bcc827c03ba29795514d57.

`final-native-pruned-smoke.json`: native WebView2 at http://tauri.localhost reports ok=true and no errors. It decoded 17 production GLBs, audio, verified WebGL2, a worker, storage, menu presence and loaded a Gran Canon world at 1024x576, very-low quality. Observed world wait: 21763.535 ms. This automated native smoke uses the existing menu message ingress, not physical clicks. It is functional evidence; NSIS packaging ran concurrently, so do not use the elapsed time for a performance comparison. Pending phases were empty; this does not certify absence of all stutter.

`python tools/package_itch.py` produced test-results/wild-guardians-itch.zip: 415002827 bytes, root index.html, all CRCs verified. Input inventory: 973 files, 470759007 uncompressed bytes. Assets are unchanged in resolution; retired experiments are excluded.

Native saved-world/night capture and real minimization/restoration validation is still running separately (process 34332 at initiation). Final CI, visual transition review and controlled lighting performance acceptance remain open. No merge claim.
