# Root review of the evidence repairs

Frozen runtime/auditor source `43f9ed5118ce6db0eafc394f839b7756cdbe2b07`; subsequent receipt-only head `c916a497`. Not integrated into main and not campaign acceptance.

Root read the frozen diffs and independently replayed an isolated Git archive of that source, its four suites and the exact acceptance-policy JSON. All **30 tests passed**, zero failure/cancellation/skip, suite **3617.023 ms**:

- seven evidence-retention failure/success boundaries;
- five exact strike-consumer/allocation tests;
- eleven original worker-encounter regressions;
- seven native prepared clock/arrival/exit/RNG boundaries.

Root also independently replayed the earlier `cb160fc0` five retention tests: 5/5, 1217.4621 ms. Its first isolated setup lacked the imported acceptance-policy JSON and failed with ENOENT before test execution; adding the exact frozen dependency allowed the replay. No runtime code was changed to obtain either pass.

The retention repair saves raw report/state before auditing and preserves a returned result after an auditor or summary throws. A pre-state exception does not manufacture state. Source changes mark both annotated report and receipt incomplete; false gates remain false. The original lost-state pilot stays incomplete and its detailed evidence is not reconstructed.

The strike audit now reconciles native allocated minus remaining budgets against four exclusive consumer types per animal/raid: AnimalLogicalHit, AnimalLogicalMiss, WorkerHit and WorkerIncapacitated. Missing or duplicate evidence rejects; no relaxed threshold replaces equality. The first allocation comes from RaidSpawned before a possible same-tick encounter. Runtime additions identify the already allocated animal and raid; they introduce no new RNG, navigation, damage, policy or economy operation. Event bytes change legitimately; no old/new full snapshot equality is claimed.

This review authorizes the previously planned migration of obsolete original clock/retry fixtures to native preparation, preserving their assertions and the existing failure/cache/persistence/reservation cases. The historical six failures must remain archived. Freeze and review that test-only migration before any new long campaign. No retry, neglect run, 100-night matrix, PR or production promotion follows from these directed tests.
