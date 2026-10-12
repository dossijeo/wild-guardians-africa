# Native search-order review and protected replay protocol

Before the replay, compare `Navigation.path`, `approachPath` and `findPathSteps` in frozen integrated runtime ae846841 with `nativeClosedApproachCertificate`:

- `approachPath` reverses `(outside, pose)` to `path(pose, outside, radius, null, false, 32)`. The helper uses that exact key and non-worker search.
- `path` returns a memoized failure before prepared or query results. The helper does the same when a region cache exists; otherwise it declines and the original method retains priority.
- Prepared and scoped successful paths decline the shortcut. Modified native search functions decline it.
- `findPathSteps` checks destination walkability and direct segment before connectors. The helper checks the exact exterior destination and pose-to-exterior segment. The surrounding service proof still tests the direct segment first and retains its original reason.
- The nine origin candidates are in the same dz/dx order, rounded around the pose. Both require walkability and the exact pose-to-lattice segment. The helper requires nonempty origins and a complete cached region for every usable origin.
- Native `known` rejects only if no unique complete region reaches an exterior destination neighbor through a real segment. The helper applies the same nine destination cells and segment check. Animal searches have no worker portals.
- Native bounded `searchedRegions` may reject earlier. The helper does not infer anything from bounded regions; it declines unless the stronger complete-region condition holds. Native fallback preserves that behavior.
- Only a fully certified null result is memoized, using the original failed-key capacity and FIFO eviction. Successful/open/unknown origins still execute ordinary approach search. The helper does not populate regions or fabricate route failure.

No optimization of first cold component construction is claimed. In particular, original complete certificates are already used inside native search. This shortcut targets setup and generator overhead, not a newly proved removal of full A* traversals.

The separate replay tool `tools/replay_native_service_certificate.mjs` uses the exact retained protected day-8 snapshot and identical legal hire/command IDs, defense-policy parameters, protected reserve 35 and one ordinary tick as the rejected terrain-cache fixture. It runs A1/B1/B2/A2 with fresh native navigators and policy instances and writes raw full snapshots/reports before asserting parity. It checks all source hashes before/after every arm. The exact full decision report, action, ledger/crops/workers/events/clock/RNG snapshot must match; failure preserves completed arms. This is one bounded expensive legal fixture, not a seven-night campaign or reconstruction of lost Q15 in-memory history. No input/strategy/economic change, renderer or inactivity acceptance measurement is introduced.

The certificate is OFF at module load; ordinary QA policy callers stay OFF. Only this replay's explicit setter enables B arms and finally restores OFF. Directed integration tests pass 10/10 (1878.758 ms); syntax and diff checks pass. No 100-night run follows without demonstrated improvement and parent review.
