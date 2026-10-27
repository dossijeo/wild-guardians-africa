# Mangrove daytime return: render-origin isolation

Controlled native shoreline round-trip, same seed/camera/time, comparing normal render origin and QA-only fixed (0,0) origin. Both arms retain natural edges, regional water, moss and sediment shore. Twenty real captures. No source renderer change is made by this diagnostic.

Normal origin: day return differs in 491252 pixels, mean absolute RGB 7.872/255; night return exact. Fixed origin: day and night returns both RGB exact. This reproduces the earlier result and isolates render-origin shifting as necessary for this mismatch in the tested path. It does not yet identify the erroneous material/light/shadow calculation. Do not disable render-origin shifting in production as a workaround: large-world precision requires it.

The remaining task is to isolate the affected rendering term using a same-pose origin switch, then fix its coordinate handling and repeat the round trip. Keep the approved moss and native shoreline work. Resource counts and checkpoint durations are in audit.json; this is not an A/B GPU benchmark.

Reproduce `node tools/experiments/capture-mangrove-origin-isolation-20261022.mjs`, then `python tools/experiments/audit-mangrove-origin-isolation-20261022.py`, Vite 5190. The only extra diagnostic intervention is replacing RenderOrigin.update with a no-op and pinning x/z to zero in the fixedorigin arm.
