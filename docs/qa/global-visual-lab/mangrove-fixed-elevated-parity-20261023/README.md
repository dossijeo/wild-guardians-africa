# Fixed512 integrated image parity: elevated, baja

Intel UHD, 1280x720; selected one-shot cache512 versus renderer-integrated fixednative, same fixture seed 712, camera, day/night and graphics quality. 60 warmup / 30 cadence samples are preparation/smoke only, not performance evidence. All four runs have no reported browser errors.

Night images match exactly. Day differences are recorded in pixel-comparison.json (10 pixels for near/media; 21 for elevated/baja). Differences are not attributed; exact daytime frame parity is not claimed. Inspected integrated near/day and elevated/night captures retain approved green substrate, relief, localized mud, fern coverage and shoreline. This validates integration against selected fixed512, not equivalence of fixed512 to the uncached original at every distance.

Combined with prior normal-camera low day/night checks, this expands view coverage; it does not constitute an exhaustive camera × quality matrix or live-campaign regression suite. No change to cache resolution, shader recipe or visuals was made.

Reproduce WG_VARIANT_SEQUENCE=cache512,fixednative; WG_PHASES=day,night; WG_COVER_QUALITY=baja; WG_VIEW=elevated; WG_MODES=cadence; WG_SAMPLES=30; WG_WARMUP=60; WG_REVIEW_OUT=<new directory>; run measure-mangrove-ground-hybrid-20261023.mjs. Leave WG_STREAM_PATH unset.
