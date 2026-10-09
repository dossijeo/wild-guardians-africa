# Original normal-main Windows failure

Original automatic push run [37997158813](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37997158813), source `ea5370cd3e446dd368b1d102a93bbc4427935c10`, finished **failure**. This was the ordinary recipe, without the experimental resource-overlap selection. No rerun is represented here.

Build and executable/installer checks passed. Packaged WebView2 smoke failed; genuine minimization/restoration was skipped. Official `desktop-smoke.json` artifact 11648067433 is preserved byte-for-byte: 3132 bytes, SHA256 `ef2cc5850216ce29044c21d9f30d88768f098e9cf6bd84bb4a4d9baea6d48ddc`. The artifact endpoint returned raw JSON, not a nested ZIP; it was saved as received. Run metadata, artifact metadata and original full log are also retained.

The snapshot reports `readyGateReached:false`, `worldWaitMs:90131.40000000002`, displayed progress88 and “Bringing your world to life...”, with a visible/focused1028×720 canvas. Error: “Production world did not finish loading”. This is presentation-only evidence: it identifies neither GPU implementation nor the exclusive cost of shaders, download, decoding or CPU generation. It supplies no raster acceptance or actual hiding acceptance. Do not infer completion from progress88, or a causal stage from the label.

The separately reviewed candidate `f7383473` overlaps presentation resource scheduling only. Its diagnostic must retain the same90-second gate and be archived separately; success or failure cannot overwrite this baseline.

Run `python docs/qa/windows-loading-regression/37997158813/verify.py` to check original report identity and the stated failure scope.

The full log is stored as `full.log.gz` because raw `.log` files are ignored by the repository. Decompression preserves all94052 original bytes; its SHA256 is checked by the verifier.
