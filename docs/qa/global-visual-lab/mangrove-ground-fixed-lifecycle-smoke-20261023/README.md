# Fixed512 lifecycle integration: initial smoke

The selected fixed512 weights shader now has a separate QA lifecycle owner. It listens to existing chunk add/remove events, admits one bake per frame under a 40 MiB cap, shares each published texture with retained material clones, restores material hooks and releases targets on chunk removal. No camera-dependent resolution or extra steady-state shader branch was introduced. Original material remains until the first target is ready.

Real renderer smoke: Intel UHD, 720p, medium, day, 90 warmup / 30 samples. All 25 targets published, no rejected requests or reported browser errors. Resident and peak cache allocation: 35,209,000 bytes (33.58 MiB). Screenshot inspected: terrain, foliage, buildings, shoreline and shadows render without obvious missing materials. Nine existing queue/chunk event tests pass. This short run is functional evidence, not a new performance comparison.

Still pending: world-change event connection (explicit invalidate(key) is implemented but not automatically wired), unload/reload and invalidation validation in the real renderer, first-use compilation and generation spikes, night and low-quality integration validation. The 40 MiB ceiling includes room for replacements but does not promise unrestricted residency beyond the current 25-chunk scene. This remains QA opt-in, not production default.

Reproduce with WG_VARIANT_SEQUENCE=fixedlifecycle, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=frame,cadence, WG_SAMPLES=30, WG_WARMUP=90 and run tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs.
