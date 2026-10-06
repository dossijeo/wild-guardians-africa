# Far biome integration: candidate

Normal gameplay has not enabled this candidate. The native-world fixture `tests/browser/far-biome-world.html` uses a paused world without saved games. `compact=1` tests a smaller resident radius: 1 versus 2 for medium, 2 versus 3 for high, and a 40-60 m tree transition. Defaults remain unchanged.

## Earlier same-residency experiment

`savanna-abba.json` was captured before the backdrop and cancellation changes in a9436f1, with 25 chunks and a 60-90 m tree transition. Four lots of 120 frames: GPU medians A1 24.70, B1 23.82, B2 24.97, A2 22.32 ms; CPU medians 6.6-6.7 ms. All 480 queries were valid. This does not demonstrate a sustained speedup. Triangles 960,014 to 955,799; calls 59 to 64.

The current version uses one continuous, lower backdrop cylinder instead of eight panels. It owns late arriving resources during cancellation. The initial JSON does not measure those changes.

`savanna.png` shows the initial elevated day camera. `savanna-horizon-night.png` also shows the initial elevated camera after a development reload; its filename is misleading and does not evidence a low horizon test.

## Memory

Four active species require eight RGBA 1024-square atlases: approximately 42.67 MiB with mipmaps; one RGBA 2048x512 backdrop adds approximately 5.33 MiB. Canyon uses two species (21.33 MiB plus backdrop). These are storage estimates, not measured total GPU/CPU memory. WebP transfer size is not decoded memory. Tests verify current-biome-only fetching and cancellation release of late textures and adapters.

Visual matching, coarse terrain seams, reduced residency navigation, angular transitions, quality profiles and combined cost still require evidence before normal gameplay activation.
