# Six-biome default configuration validation

Started after rejecting cached distance ordering at 229edf86f. Run `node tools/experiments/run-six-biome-quality-defaults.mjs` with Vite on 5220. This launches browsers sequentially, stops on harness failure, and records exact conditions and source hashes. The preexisting harness is not edited; its working diff is retained here for reproduction against the recorded commit.

The URL is reduced to qualityActive, qualityMenuProtocol and qualityRequireActive, leaving production rendering defaults. The fixtures are historical populated saves, not newly generated worlds. They test compatibility with saved worlds, not the current estuary recipe or advanced raids. Each quality cycle changes medium/low while moving the camera and keeping simulation active, checks final stream drainage and resource retention, and captures settled frames.

Important limitations:
- The harness permits compiler messages containing f_environment4; inspect the full warning/error list even when exit code is zero. Some messages also contain f_africanToon4. Do not call this a clean-console result.
- The final gl.getError check is deliberately synchronous and can itself stall. Manglares recorded 90.71 ms and Sabana 85.25 ms in those checks. These are QA diagnostics, not proof of a production render stall. Do not interpret total transition wall time as main-thread CPU blocking.
- Only 12 presentation samples per transition in these first cases: percentiles are descriptive, insufficient for performance acceptance.
- Screenshot settling deliberately extends total test wall time. Post-travel wait includes this settling and is not chunk latency.
- Day/night, spells, construction, world exit/restart and new-world layout require separate coverage. No broad completion claim follows from this suite.

Initial verified results: Manglares and Sabana completed the three quality changes, 240/240 simulation-advancing movement frames, 15 created chunks each, zero paused frames and no failed/pending final streaming work. Manglares medium screenshot was inspected: ferns remain visible. Remaining runs are in progress; regenerate summary.json with `node tools/experiments/summarize-six-biome-quality-defaults.mjs` after completion.
