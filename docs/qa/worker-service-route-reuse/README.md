# Worker service routes: blocked-proof audit

This is a negative experiment on `main` source `df9365340956532ffa7f7f5812ba964094e6b0e3`, not an accepted navigation change. The frozen input is `tests/fixtures/desierto983-d15-partial-state.json.gz` (SHA-256 `9f4dd3846951204276e2cf1b45348767c29d128816ffb2d401dddc4b31c56fb6`). The WASM binary SHA-256 is `7817ebadc3dfa4c4d32f6197b5c4eb53468ad5f7f23293d72b902c23a7707095`.

Run `node tools/experiments/profile-worker-blocked-routes.mjs` for an A/B/B/A comparison of the existing native worker blocked-proof switch over two `Game.tick(state, 1, nav)` calls. Add `--classify` to attribute native `routeActor` calls by JavaScript caller. The script reconstructs the same session and resident chunks for every run, measures only the two ticks, and requires identical serialized-state SHA-256. The classification mode captures stacks on every call, so its times are diagnostic only.

| Variant | Native routes | Blocked | Watering approaches | Other task planning | Movement | State SHA-256 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Worker proof disabled | 1,037 | 1,037 | 835 | 160 | 42 | `5fdf4e3a01f74dbc4be2b41a8213ca27a258b14f33bef7e723e2f8c101a6ba6d` |
| Current worker proof enabled | 866 | 866 | 835 | 8 | 23 | same |

These counts repeat in both A and both B runs. All 1,037/866 native answers are `blocked`; none are `unknown` or `found`. The present exact blocked-proof cache saves 171 calls (16.5%) without changing the state, but cannot meet the existing test's 75% reduction threshold. In the unclassified A/B/B/A run, the two-tick times were 754.7/709.3/788.2/832.1 ms. Four short runs under concurrent host load are insufficient to claim a reliable total-time improvement.

I temporarily routed the fallback searches in `work-points.js` through `nav.workerPath` and added that function to the watering-route cache epoch. The same fixture still made **866** native calls and **835** watering-approach calls, with identical serialized state. The experiment was reverted; no production source change is retained. The approach positions differ, so an exact start/end cache does not share the answer among them. A separate sample of 100 watering queries returned `blocked` from the native region-connectivity query, which suggests a shared-region opportunity but does **not** prove that every approach to every crop is blocked.

The next candidate should ask the native graph whether a worker can reach a crop group's service region before trying individual watering points. It must retain `unknown` distinctly, preserve valid approaches on opposite sides of a wall, and compare complete state, route counts, `Game.tick` time and sustained campaign time. Do not lower the current failing 75% assertion merely to make the suite green; it records an unmet performance target. Do not add another exact per-crop route cache: this fixture demonstrates why that cannot remove the dominant work.
