# Controlled native crop-pair AB/BA — no promotion

Four sequential local saved-game passes completed on the exact official Windows executable from source `28b681f3`, run38024049488. The executable SHA256 is `b430294037ad534b5a35e7bb08b2060c4a904e00ffe89ba5ff5cf1376a19dc71`; the same legal fixture SHA256 is `28d8bf348c61900a7f4f94a53026a86e638acbca5b058981a43de969788a6406`. Each pass uses a new WebView2 profile. A keeps the serial source recipe; B enables only complete crop-pair overlap. No visual readbacks or GPU timers were enabled.

| Pass | Recipe | World ready | Native hidden interval |
| --- | --- | ---: | ---: |
| 1 | A | 18.509s | 300.813s |
| 2 | B | 18.556s | 300.184s |
| 3 | B | 18.304s | 300.864s |
| 4 | A | 18.139s | 300.633s |

All four original reports have `ok=true`, no errors, successful exit0, unchanged hidden simulation and the original readiness/visibility gates. Renderer and scenario match: Intel UHD Graphics/D3D11, Gran Cañón/Mapungubwe,1024×576. Both B passes contain one successful crop-pair join; A contains none. No attribution overflow occurred. The runner completed and all owned game processes exited.

Mean A18.32375s, B18.42990s: B minus A **+106.15ms**. This small four-sample descriptive difference demonstrates no total-load saving in this local comparison; it does not establish a statistically significant regression. The crop join finishes in745.1/730.4ms, while A source phases take402.5+698.1ms and370.2+682.8ms sequentially. The scheduling works, but no net readiness benefit is established. Keep this experiment OFF in production; do not promote on the strength of the separate successful WARP CI trial.

OS/file/driver caches were not reset. Parent/nested phase times include waits and must not be summed as exclusive CPU/GPU time. This is not loading-frame stability, GPU pass timing, peak memory, physical input, portrait, composited HTML UI or all-biome visual acceptance. Those requirements remain open independently of these positive native checks.

The original receipt, four reports, fixture and executable provenance are stored losslessly as deterministic gzip with lengths and hashes in `archive.json`. `summary.json` is derived separately; originals are never rewritten. Verify with `python docs/qa/windows-loading-regression/native-pair-abba-root/verify.py`.
