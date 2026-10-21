# Remaining microevent readability review — rejected experiments

Baseline: `516ad00d95f4d218b8819c82d43febe769c3352c` (main, including #197, #198 and #205). Review date: 2026-10-21. All production art and runtime files were restored to that baseline. No visual change is proposed for adoption.

## Inventory and decision

Real in-game captures used the wood fixture at 1280×720, seed 178 and particle time 0.75 s. Crops retain the original pixel scale. [Baseline audit](baseline-audit.webp) contains smoke, fire, dustdevil / vortex, hail, rareseed / snake in reading order.

| Event | Finding | Decision |
| --- | --- | --- |
| smoke | Stacked lobes are mechanical, but readable as smoke. A soft ribbon replacement became too blue and nebulous. | Preserve original. |
| fire | Uses smoke as a secondary sprite; the same replacement weakened separation from the flame. | Preserve original. |
| dustdevil | Repeated small loops read as beads; this remains an artistic weakness. | Three atlas experiments and one formation experiment rejected. |
| vortex | Shares the dust sprite. A stronger continuous circular gesture is possible, but tested variants lose dusty volume. | Same rejected experiments; preserve original. |
| hail | Distinct falling pellets at gameplay scale. | No change. |
| rareseed | Recognizable contrast and silhouette. | No change. |
| snake | Readable articulated body and head. | No change. |

The prior bird, cloud, spirit, burrow, gust, heat, rain and lightning improvements were reviewed in the integrated code and QA history. They were not repeated. Fog was not recaptured in this pass and is not claimed as a new visual audit.

## Rejected comparisons

All comparisons show original on the left and experiment on the right.

1. [Soft atmospheric ribbon atlas](rejected-prototype.webp), rows smoke, fire, dustdevil, vortex: smoke becomes a blue veil; dust is too faint.
2. [Denser dust core](rejected-flat-core.webp), rows dustdevil, vortex: improves visibility but looks like flat brown chips.
3. [Lit, domed dust ribbon](rejected-volume.webp), same rows: restores volume but repeats obvious crescent shapes.
4. [Tangential formation with original atlas](rejected-formation.webp), same rows: widths ×1.4, heights ×0.55 and tangential rotation connect the ring, but resemble a wreath of fibers or branches. The small dustdevil loses volume and contrast. Particle centers, counts, hit radii, simulation and gestures were unchanged during this experiment.

The formation experiment is reproducible without changing production files using `tools/experiments/capture-dust-formation.mjs`. Start Vite, set `WG_QA_PLAYWRIGHT_MODULE` to an installed Playwright module and `WG_QA_URL` to the server, then run the script. It injects the rejected rendering rule only into the experimental browser page. Full original captures remain in the local `test-results` directories; the checked-in images are unscaled crops.

## Cost and validation limits

[Captured renderer counters](formation-captures.json): original and formation variant both use 76 full-scene draw calls. Dustdevil has 14 billboard instances and 994,163 scene triangles; vortex has 22 instances and 994,179 triangles. No browser page errors were captured. Variant quad area is 77% of baseline; this is geometry arithmetic, not a measured GPU speedup.

No FPS improvement or regression is claimed. Since all candidates were rejected visually, no performance benchmark or gesture replay was used to qualify them for shipping. Production interactions, hitboxes, animation, camera and time code remain byte-identical to baseline.

Validation of restored state: all 84 directed tests in the five microevent test files pass, including completion of all 40 definitions through actual world projection. `npm run build` passes with the existing bundle-size and mixed-import warnings. The capture script passes `node --check`.
