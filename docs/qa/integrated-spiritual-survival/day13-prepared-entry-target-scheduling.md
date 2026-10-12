# Day 13 entry preparation and rejected target scheduling

Source: the retained `pilot-v128-day13-split-entry/checkpoint-state.json.gz` native checkpoint, Sabana/Mapungubwe, day 13, seed 123. This is a copied-state CPU replay without virtual-player decisions, spells, repairs, rendering, or a complete campaign. Worker wait time is measured separately from `Game.tick` time. Raw traces beside this report preserve negative results.

The campaign runner formerly waited for a prepared raid entry only at time 600. Its five-second native ticks crossed the planned spawn time (~454.4) earlier, forcing the whole-group entry search synchronously. Commit `99267e49` waits when the next tick crosses the actual plan time. The same 16-animal entry is now prepared in the real Node worker. In the prepared-entry trace, the worker wait took ~2.5–2.7 seconds of wall time outside the simulation tick, while spawning the prepared group itself took about 5–8 ms. The worker is used once, with no obsolete reply. The worker wait does not advance the game clock or RNG. Forty-four entry/driver tests passed.

Target selection remains the main-thread problem after spawn. With the existing synchronous target selection and 0.1-second native ticks, the largest `Game.tick` was 1,441 ms in the exact checkpoint replay. Several candidate approaches inside a closed defense require expensive route searches even after the conservative closed-region optimization. The resulting state hash was `e96b6657020956c8bc6f8491bd0247e9c82b7ac9f57758a2d6449724e3933a15`.

| Trial, same checkpoint | Largest 0.1-second native tick | Functional observation |
| --- | ---: | --- |
| Prepared entry, original target selection | 1,441 ms | Original targeting and state hash |
| Slice at most 32 targets per update | 139 ms | Target acquisition delayed |
| Slice at most 8 targets per update | 122 ms | One target still consumed ~85 ms across approach samples |
| Slice targets *and* approach samples, budget 8 | 71 ms | No target acquired by 455 seconds |
| Slice targets *and* approach samples, budget 4 | 70–77 ms | All 16 animals still lacked a target at 460 seconds, over five seconds after arrival |
| Copy worker closed-region certificates | 1,242 ms | Same final state hash; insufficient improvement |
| Copy worker failed-path keys as well | 1,527 ms | Same final state hash; slower than the certificates-only trial |

The slicing experiment passed 29 targeted raid/save tests after a pending-search cursor was serialized and validated. It was nevertheless rejected because it delayed attacks substantially in the dense checkpoint. The target-slicing code and worker-certificate transfer were reverted; only the raw traces and this report remain. Neither the 100-night campaign nor `main` should use those trials. A future candidate should move the expensive initial target decisions into the existing entry worker and validate each prepared choice against the live state before applying it, preserving the native target ordering and immediate attack behavior. Any fallback must remain correct when the farm changes after preparation or a save is reloaded.

The full repository test command was started during investigation but stopped after unrelated `QA-147` paid-reload expectations failed; its output does not certify this candidate. The narrower raid and worker suites above are the relevant checks. No 100-night campaign was launched because the post-spawn tick is still far beyond the agreed performance range.
