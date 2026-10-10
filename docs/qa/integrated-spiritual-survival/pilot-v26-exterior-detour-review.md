# Retained day-10 exterior entry failure: positive detour evidence

The protected seed-2026 fourteen-night pilot remains technically incomplete,
not defeated. Its original partial snapshot is unchanged. No continuation or
whole-horde acceptance is claimed by this diagnostic.

Run from the integration worktree:

```powershell
node tools/probe-native-exterior-detour.mjs docs/qa/integrated-spiritual-survival/pilot-v26-empty-entry-diagnostic-v1.json <fresh-output.json>
```

The read-only probe takes the body-valid warthog birth position from the
previous native camera-entry diagnostic. It uses the real 1.1 body radius,
native navigation and animal collision policy, and the exact reference bounds
used by the exterior witness. It tests at most four cardinal exterior endpoints
in increasing distance order. It never spawns actors or changes their budget.

The north and east endpoints are not body-valid. The west search finds no route.
The south endpoint at `(98.000627127201, -123.1)` has a native approach path:
153 points including the birth, all 152 segments independently pass animal
collision checks, and its endpoint satisfies the existing exterior witness.
The original snapshot SHA-256 remains
`88dd15f0f1cf0ddeaabbdeb9111b3cff61b55d0fe9ba97cd85152d1567d4ee19`.

This is positive evidence of a bent exterior route for the largest radius in
this pending group. The straight-ray rejection cannot be interpreted as proof
that this particular position is enclosed. It does not certify every entry/exit
of the sixteen actors; those positions must still be checked individually.

The successful final query took 498.3 ms locally; all four queries together
took about 902.2 ms. A repeat produced the same positions, paths, collision
results and certificate, excluding timing. This cost rules out calling this
fallback per actor or per frame. Any runtime fix must use bounded preparation,
reuse positive certificates at compatible radii, preserve invalidation when
geometry changes, and retain conservative rejection for truly closed or mixed
natural enclosures. It must not bypass collision checks or thin the horde.

No runtime navigation or raid-entry code changes are included in this commit.
Further entry validation is required before launching longer balance campaigns.
