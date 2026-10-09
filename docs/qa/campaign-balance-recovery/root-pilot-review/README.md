# Root review of the rejected income pilot

Root independently repeated `tools/audit_balance_pilot.mjs` in the recovery
worktree against the original Actions artifact of run `37881877946`, source
`2bdac97e3439f6f9cf4b99b4f2ec1007f8bc2d5b`. The read-only audit ended with exit 0
in 1.73 seconds. It did not replay the simulation or modify the source/snapshot.

[Verification](verification.json) records 321 exact source hashes, complete
snapshot-derived summary equality, physical deliveries and integer accounting.
[Actions terminal](actions-terminal.json) retains the original job identity.
The full original payloads and auditor are preserved in the immutable
[recovery archive at 734a1ad8](https://github.com/dossijeo/wild-guardians-africa/tree/734a1ad8/docs/qa/campaign-balance-recovery).

The Canyon/Mapungubwe seed-712 pilot survives 100 nights, with 15,200 physical
crate deliveries. Its daylight inactivity is 10,829 / 30,000 = **36.0967%**,
so it fails the user's strict below-25% activity requirement. CI success and
victory do not override that result. The experimental income change remains
unpromoted; main does not inherit it from these documentation files.

The final snapshot is after worker cleanup and cannot establish daytime service
rates or route failure. It contains 2,608 live plants, including 2,198 waiting
for their initial watering. The next native diagnostic must measure actual
working-day tasks/routes rather than infer employee utilization from that final
snapshot. A bounded five-day diagnostic is separate from this hundred-night
result and cannot establish full campaign acceptance.

This is an archive/accounting review, not current-main hundred-night coverage,
rendering QA, a performance benchmark, or a release approval.
