# Sabana backdrop pilot — not accepted

The baseline and 18-ridge candidate use runtime 8b8a931 with the same exact camera and target. These are day/night native screenshots and full DOM-exported diagnostics, not a performance benchmark. The candidate changes only an offline 2048×512 RGBA backdrop texture; production assets remain untouched.

The candidate provides more skyline variation, but the broad trapezoidal shapes remain visibly simplified and the large baobab still shows transition dither. It is not accepted as the requested finished horizon. Both variants submit 65 calls and 718574 triangles in the recorded daytime pose; that count does not establish equal GPU time.

Resource-key prefix 0 is a resource epoch, not a LOD index. Current explicit diagnostics show LOD2; no visual improvement is attributed to the separate bank-LOD invalidation fix.
