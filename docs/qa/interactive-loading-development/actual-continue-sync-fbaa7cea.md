# Actual Continue synchronous attribution fbaa7cea

Frozen runtime fbaa7cea (includes merged main a7aa4053 library/voice behavior), native menu Continue→temporary dense archive→loading→HUD→pause→Save/return-menu. Viewport1280×720. Root confirmed no heavyCPU/GPU concurrent. No GL queries, independent render loop, fixture hashes or serialization during presentation. Existing RAF raw intervals and optional synchronous CPU witnesses are retained unchanged.

Worker270.4ms,473ACK chunks, delivery518.4ms, assembly49.7ms,8yields. Total862recorded RAF intervals,max199.5ms,p9549.8ms,9>100ms, presentation17991.4ms; readiness/progress1/pending[]/no error. This is diagnostic, not a paired performance comparison.

Direct CPU wall witness sync-crop-resize183.4ms at18735.2–18918.6, inside restore-sync208.7ms at18725.6–18934.3. Nearby RAF timestamp18922.3 has interval199.3ms. RAF timestamps and handler performance clock are distinct observations; do not equate the entire interval with one operation. Source shows restored crops above initial capacity128 dispose/rebuild all72native stage/morph renderables via synchronous createCropBatch, despite initial loading construction being cooperative. This measured operation supports testing an appropriately sized initial asynchronous batch.

Second interval199.5ms at19404.5 is not explained by these witnesses. Other7>100 intervals and all raw samples remain included. Warm depth capture11.2ms; other recorded synchronous witnesses <10ms. No overall loading fluency acceptance. No causal total-time or physical memory claim.

HUD day101/21:29, no warn/error logs. Audio005 starts before soilinteraction and stops at handoff, loadingVoices[]/running context. Save/return-menu verified;118closed, temporary slot117removed with visible confirmation andseedclosed; viewportreset/browser2inventory[]. Actual-app contextLost not queried. No featurePR; further attribution and lifecycle/memory/performance gates remain open.
