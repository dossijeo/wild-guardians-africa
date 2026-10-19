# Two 100-night balance reference campaigns on Wild Engine

Two unmodified topological-defense campaigns were run after [PR #151](https://github.com/dossijeo/wild-guardians-africa/pull/151) reached `main` at `ee0c93a0`. Both use the same game source SHA-256 `d169104538500fcb87f4dda20ecf93db0715df9087e7e9117175d7f7ae5b7781` and Wild Engine WASM SHA-256 `6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551`. The reports record one serialized-state hash and separate `Game.tick`/bot-decision timings for every day. No price, wage, damage, raid-pressure or bot-policy parameter was changed for these runs.

| Campaign | Result | Living crops / coins after night 100 | Lowest coins | Raid evidence | Elapsed / `Game.tick` / bot decisions |
| --- | --- | ---: | ---: | --- | ---: |
| [Volcanes/712](volcanes-712.json) | Victory, 100/100 nights | 0 / 275 | 200 on day 89 | Verified, no issues | 441.15 / 304.09 / 86.71 s |
| [Sabana/123](sabana-123.json) | Victory, 100/100 nights | 4 / 70 | 70 on day 100 | Verified, no issues | 539.27 / 354.88 / 125.69 s |

Both are narrow victories, rather than evidence that the bot wins every world. Volcanes had 35 living crops after day 99 and none after the last raid; Sabana had three after day 99 and four after day 100. The current rule in `closeNight()` checks whether the settlement can afford another day before declaring victory on the hundredth completed night. Volcanes therefore met the existing victory condition despite losing its final crops. This report does not propose changing that rule or infer that its empty farm would recover in postgame.

The Volcanes run's first 60 daily hashes match the prior [60-night candidate](../complete-wall-quote/volcanes-candidate-60.json), which is an independent execution on the same game source and WASM. Sabana/123 is one run with a recorded hash sequence, not a repeated determinism trial. Neither campaign was paired with an alternate balance policy, so the numbers cannot establish which spending or defense decisions were better. The times are headless CPU measurements on one Windows host, not browser frame times.

Reproduce from `ee0c93a0` with:

```sh
node tools/experiments/compare-repair-preview-campaign.mjs batch OUTPUT.json 100 712 volcanes
node tools/experiments/compare-repair-preview-campaign.mjs batch OUTPUT.json 100 123 sabana
```

The script fixes the seed, `good` strategy, Mapungubwe culture, topological defense, native spatial advice and intents, and confirmed wall plans. It uses the ordinary legal campaign actions and checks raid evidence. This is a reference for subsequent balance experiments: compare daily hashes when the policy is intended to be unchanged, and compare survival, agriculture and money separately when a policy or parameter is intentionally changed.
