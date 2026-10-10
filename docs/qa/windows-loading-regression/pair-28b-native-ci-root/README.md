# Original positive Windows trial — complete crop pair

Source `28b681f36b7a49ce6f89f4f5fd2307f9d96ffa93`, isolated candidate. [Windows run 38024049488](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38024049488), job `114130993388`, is terminal success. The original reports, complete job log, API metadata, root's 72-test log and original world PNG are preserved with SHA-256 receipts. The packaged game uses the original 90-second readiness gate; no timeout relaxation occurred.

The initial **New Game** smoke selected `cropPairOverlap=true`, finished loading in **56,412.7 ms**, and recorded an actual `load-crop-pair-join` interval. Both sources began during that interval: steady 1,225.5 ms; bridges 2,564.0 ms; parent join 2,673.5 ms. Nested spans are not exclusive CPU/GPU durations and must not be added together. The existing context reports ANGLE on Microsoft Basic Render Driver.

The separate **Continue** visibility run used the default serial recipe (`cropPairOverlap=false`), loaded in **68,192.8 ms**, and passed **300,316.2 ms** of genuine native hiding. All 21 simulation fields remained identical. Restoration retained only the menu pause, then simulation resumed by 1.128 seconds. No synthetic visibility override was used.

These are different New/Continue scenarios and application/cache histories. **The 11.8-second difference is not a measured saving attributable to the overlap.** Earlier failed native runs remain failed. This successful run demonstrates application of the candidate and native readiness, not a paired performance improvement or all-biome visual approval.

The original canyon PNG shows terrain, river and village buildings. It does not show the loading diorama, prove crop morphs or represent composited HTML UI. Physical interaction, portrait/loading UI, corrected first-night visual capture and final deduplicated all-biome acceptance remain open. A same-executable, same-save local AB/BA runner is prepared separately; it has not yet run.

Verify from repository root: `python docs/qa/windows-loading-regression/pair-28b-native-ci-root/verify.py`. The official EXE's metadata digest is retained, but a local executable download must finish and match it before local execution.
