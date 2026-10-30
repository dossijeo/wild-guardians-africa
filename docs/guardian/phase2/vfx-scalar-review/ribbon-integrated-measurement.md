# Integrated check at 1d3764a2c

Intel UHD, 1600×900, pixel ratio 1, 20 beasts. Eight ABBA/BAAB presentation-only blocks, no recording, no hidden frames, no errors, maximum one visible Guardian. Reference averages 27.45–28.46 FPS, frame p95 49.91–49.96 ms. Guardian averages 23.11–24.60 FPS, p95 66.39–66.54 ms. Draw p95 93 versus 104. Guardian animation p95 .185–.230 ms; VFX p95 .410–.495 ms. Raw status: abba-ribbon-ranges.json. Screenshot shows the fixture after measurement, not an active summon.

This is not proof of an improvement from ribbon upload ranges: the comparison toggles the whole presentation, not the upload implementation. Performance acceptance remains unmet. Navigation is disabled; this is not moving-raid coverage.

Followed with two interleaved identical-pose GPU-query runs, 40 warmup and 240 timed frames each (60 per mode). At age .12 s, GPU medians none/body/effects/all: 24.711/25.359/25.246/25.411 ms; p95: 26.643/27.358/27.976/27.692 ms. At age .8 s, medians: 25.179/25.706/25.124/25.999 ms; p95: 28.092/28.572/29.196/30.294 ms. All modes still execute animation updates; only draw visibility differs. Raw GPU results and timer health are in gpu-ribbon-arrival.json and gpu-ribbon-settled.json. These instrumented frozen frames must not be interpreted as gameplay FPS.

The frozen-pose median differences do not by themselves explain the successive-cast RAF tails. Effects-only being slightly faster than none in the second run also shows measurement variability. Further attribution must examine the dynamic cast/update lifecycle; these observations do not justify reducing visual quality or changing the unrelated engine baseline.
