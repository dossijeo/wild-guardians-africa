# Day 9 crossing without mobile phasing

`replay-worker-crossing.mjs --no-phase` is an isolated counterfactual. It loads
the frozen Sabana/Mapungubwe/712 day-9 crossing, retains the two saved paths
through the fresh native session, and sets the two involved workers' bounded
mobile-recovery attempts to their cap. Other workers, navigation, terrain and
game rules are unchanged. This flag is QA-only; production behavior is not
modified.

```powershell
node tools/experiments/replay-worker-crossing.mjs --steps=100 --summary
node tools/experiments/replay-worker-crossing.mjs --no-phase --steps=100 --summary
```

Both runs advance the same 100 steps of 0.1 simulated seconds. The original
replay triggers `ActorMobileCollisionRecovery` for `worker-7088`; the two
workers approach to a sampled center distance of 0.223 m, penetrating their
combined 0.56 m body radius.
With phasing suppressed for those workers, neither recovery occurs. Their
minimum sampled center separation is 0.564 m, and both travel through the crossing
and continue along their retained routes. After ten seconds, the workers are
10.608 m apart and the route remaining has fallen to 1.077 m for
`worker-7072` and 22.997 m for `worker-7088`.

This shows the local avoidance can negotiate **this saved crossing** without
sampled body overlap or the unsafe phase. The replay does not independently
audit every substep's swept body clearance. It does not prove that suppressing phasing generally is
safe: the 14-night campaign trials in `README.md` and
`route-progress-recovery-rejected.md` lost deliveries and crops when recovery
was suppressed more broadly. The counterfactual narrows the next question to
distinguishing encounters where the existing detour will resolve from those
where a worker genuinely needs coordinated yielding or another bounded
escape. A simple global timer change is not justified.
