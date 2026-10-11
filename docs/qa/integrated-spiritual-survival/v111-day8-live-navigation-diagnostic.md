# Live v111 day8 delay — debugger observation

The completed journal remained at seven days, so CPU liveness alone was insufficient to claim progress. Node's CLI debugger was attached to confirmed native campaign PID51796 without restarting it. Read-only local inspections found:

- day8/time260.00000000000057, nativeServiceComponentProof, target plant-5284, 1,522 service poses examined;
- a subsequent observation at day8/time264.3000000000014 inside reserveAvailableTasks/wateringRoute.

This proves simulation-time progress between the observations and excludes a permanent loop at the first sampled point. It does not establish that every future operation will terminate quickly. The first stack passed through terrain.slope, coarseSegmentClear, nativeServiceComponentProof, nativePerimeterProof and the QA funded-defense policy coverage call. That policy examines32 service orientations per target, with native route and closed-component proofs, making an enclosure check expensive on a large perimeter.

A short inspector CPU sample spans27,942.376ms. Its largest **self** times were findBuildingRoute11,147.844ms, wateringRoute5,217.052ms and cachedFractionalWalkability2,506.945ms; nativePerimeterProof self time was472.995ms, which excludes the cost of its callees. Thus the sampled delay also contains substantial native worker navigation; the enclosure proof is not the only bottleneck. These are sampled instrumented CLI CPU costs, not GPU measurements, uninstrumented benchmarks or gameplay FPS.

The gzip-compressed original profile and SHA-identified summary are retained next to this note. The campaign was resumed after bounded debugger pauses and the debugger detached. No source, state, RNG, money, damage or policy was assigned or replaced. Debugger pauses and profiling add diagnostic wall-clock overhead, which must be disclosed when discussing campaign execution time. The source manifest is separately rechecked; the seven completed days remain the authoritative completed horizon until another row is written.

Next optimization target is the repeated native building/watering route work and perimeter coverage certification. Any optimized candidate must preserve physical routes and output semantics, validate against frozen snapshots and remain distinct from this running configuration; do not skip checks or manufacture elapsed simulation time to finish the campaign faster.
