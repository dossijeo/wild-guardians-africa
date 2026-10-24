# Fine-region entry and withdrawal

The optional smooth-cache shader now applies continuous fine-region visibility after combining old/new detailed regions, preserving the coarse material beneath. Visibility changes over 180 ms; removal waits until visibility reaches zero before releasing the fine target. A changed camera preference can reverse the direction while the target remains alive. Pending obsolete fine generation is cancelled. The atomic-cache variant remains unchanged.

## Real renderer probe
Chrome/Intel UHD, medium quality, populated paused Mangrove scene, 720p. Camera height sequence: normal → +70 m → normal, 120 rendered observation frames per stop. The elevated view exercises the projection planner rather than manually toggling a material flag.

- Initial normal view ends with fine region 2,0 at visibility 1, ten total cache targets, 16,969,744 bytes.
- Elevated view contains eight observed intermediate withdrawal weights and ends with no fine region. Eleven coarse targets remain, 15,491,960 bytes.
- Return contains seven observed intermediate entry weights and restores fine region 2,0 to visibility 1, ten targets and 16,969,744 bytes.
- Two additional intermediate entry samples appear during initial preparation: 17 intermediate observations overall.
- Peak reservation during the height probe: 21,193,224 bytes (20.213 MiB). No browser/GL errors.

Raw visibility, residency and memory observations are in sceneAudit.ablation.visibilityProbe. Nine queue/chunk lifecycle tests also pass. This proves execution of gradual fine visibility and release after the elevated-camera change; it does not prove every transition is perceptually invisible or establish performance. The post-probe cadence window is diagnostic only.

## Remaining
Original-to-cache first publication is still atomic and must be addressed. Rapid reversals before completion, temporal video inspection of elevation changes, night/low profiles and new controlled whole-frame measurements remain pending. Budget estimates exclude driver overhead, shared originals and the auxiliary 1×1 fallback texture. Keep the variant experimental and PR #159 draft.

## Reproduce
Hybrid harness: WG_VARIANT_SEQUENCE=smoothvisibility; WG_PHASES=day; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=cadence; WG_SAMPLES=30; WG_WARMUP=30; WG_REVIEW_OUT=this folder. Clear WG_CAPTURE_MATERIAL_TRANSITION, WG_DRAW_CENSUS and WG_FRAME_STEP.
