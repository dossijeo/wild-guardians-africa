# Day 13 wave-entry scheduling diagnostic

Source baseline: `c003d58a508c08db0f483aecb5eb080985d188af`. The retained day-13 native campaign checkpoint at time 492 has an active first wave. `tools/profile-native-wave-entry-checkpoint.mjs` replays it through the production-equivalent Node entry worker without virtual-player decisions. These wall-clock CPU samples are diagnostic, not rendering frame times or campaign outcomes.

| Variant | Maximum 1-second native tick | Entry-worker waits | Prepared entry used |
| --- | ---: | ---: | ---: |
| Existing immediate second wave | 1,154 ms | 0 | No |
| Experimental one-second separation | 1,276 ms | 1 (1,506 ms) | No |

The experimental worker produced a three-animal entry, but `spawnRaid` reported `target-hint: prepared=false`, and `RaidEntryPreparer.stats.used` remained zero. The 1-second separation lets the worker run but does not preserve a matching entry key by the time the wave spawns. `selected-entry` still costs 843 ms. The delay also changes raid timing and therefore is not an acceptable isolated performance fix. The experimental scheduler change was reverted; no balance or production setting was changed.

Raw observations: `day13-v156-wave-entry-before.json` and `day13-v156-wave-entry-after.json`. The next investigation should identify why the entry key becomes stale between readiness and spawning, and whether the expensive native animal approach paths can be reused or made cheaper without weakening physical navigation.
