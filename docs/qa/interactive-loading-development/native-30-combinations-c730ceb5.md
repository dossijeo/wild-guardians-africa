# Native30-combination compatibility and waiting-time calibration

Frozen sourcec730ceb5, qualitymedia, same1280px IAB parentviewport, native sequential child worlds withseed712. All six biomes crossed with allfivecultures:30/30 ready,exactcamera/logical/restoredLogical state,errors[],dispose/contextLosttrue. Each child was explicitly disposed before removal and before creating the next. Tab68closed. This is functional compatibility, not actualmenu/autoplay/mobiletouch or an isolated GPU benchmark.

The matrix stores ResourceTiming summaries: allcasesunknown0,networkpending0/failures0. DirectVite5290 did not retain the large asset bodies as verified HTTPcache for these loads: mostly1applicationcache hit with207–215 actualnetworkrecords. Do not call the sequence a warmcache benchmark. Controlled cached/partial evidence remains the separate5293 server reports.

For each case, exclusive-wait proxy=max(0,initializationMs-observedTransferIntervalUnion). It measures elapsed preparation/scheduling outside observed network intervals, not totalCPU/GPU work: concurrent decoding/rendering can overlap network, and this subtraction intentionally does not count both again. No individual network-inclusive stage durations are summed into the denominator. Initial renderer setup, worker scheduling, bounded GPU uploads/fences and reveal preparation remain included in the elapsed proxy.

Across30cases: median16026.1ms,mean16983.1ms,range10326.4–39706.4ms,interquartile15595.1–17438.8ms. Per-biome medians:

| Biome | Exclusive wait median(ms) |
|---|---:|
|sabana|16075.4|
|gran-rio|15771.1|
|manglares|16342.6|
|volcanes|15918.1|
|gran-canon|11331.1|
|desierto|19473.1|

The Desierto/Saheliana outlier was39.7064s; preserve it. The sequential order and historical CPU background confound per-biome causality; do not create a performance claim or per-biome calibration from those medians. Default work estimate is recalibrated from14s to rounded16s global median, explicitly still estimated. Other quality/hardware/dense-farm estimates remain uncertain and may vary. The actual milestones and monotonic maximum determine progress, while100% still requires actual world/GPU readiness and zero native-pending transfers.

Independent Sabana controlled cases support the broad estimate: HTTPcold17.0736s,partiallyretained16.6679s,deliberatemissingGLB/HDR16.4781s,slow16.3325s exclusive-wait proxies. They are single functional observations,not matchedspeedmeasurements. Slowtransfer57.8245s plus16.3325sexclusivewait equals actual74.157s initialization; no downloaded duration is added twice. This does not prove totalRAM/VRAM or performance neutrality.
