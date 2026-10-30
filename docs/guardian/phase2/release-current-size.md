# Current release gate: baed3c140

Fresh npm run build completed successfully in 17.46 seconds, with existing chunk-size and mixed-import warnings. The build shares exact embedded GLB image bytes across 20 models in 10 banks, saving 35,116,636 bytes without changing image pixels.

The resulting package has 1,071 files and 550,633,454 bytes. check_web_package.mjs reaches and fails its 1,000-file assertion; its subsequent 500 MB assertion is not executed. The independent inventory also demonstrates that the byte limit is exceeded. Neither gate passes. This supersedes the older 998-file receipt; no cause is attributed without a matched historical build.

Only 65,112 bytes are exact duplicate files (wall library metadata and crop thumbnail metadata). Removing them cannot solve either overrun. Largest categories are web GLBs (176.66 MB), far vegetation WebP (52.27 MB), Opus audio (43.66 MB), and standalone mapped WebP (41.18 MB). These are inventory facts, not evidence that those assets are unused or safe to downgrade. No gameplay resources or approved texture quality were removed.

The file-count investigation should next inspect cinematic/content metadata for safe release-only consolidation, retaining runtime consumers and exact data. The byte-size investigation needs asset reachability or lossless savings; global image quality reductions are not authorized by this result.

Raw inventory: release-current-size.json. This audit does not certify runtime visuals, audio or frame performance.
