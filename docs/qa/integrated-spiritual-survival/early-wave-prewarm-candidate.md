# Early second-wave preparation candidate

The day-13 native checkpoint at time 492 exposed a synchronous second-wave spawn while the first cohort was leaving. With no prepared entry, the maximum 1-second native tick was 1,154 ms. A one-second simulated delay alone did not help: the entry key changed because it included positions of fleeing workers who cannot block an entering animal. That negative result remains in `wave-entry-scheduling-negative.md`.

Candidate changes:

- Start preparing the next cohort when every prior animal is retreating or gone, without spawning it until all are gone.
- Keep the preview outside saved state. The actual next-wave plan, RNG, entry checks and physical spawn are unchanged.
- Exclude moving, non-incapacitated workers from the entry key; incapacitated workers remain physical blockers and still invalidate a stale preparation.

Exact-checkpoint diagnostic (`day13-v159-early-wave-preview.json`): maximum native tick 107 ms, prepared entry accepted, three target choices accepted. The worker preparation wait was 4,698 ms of wall time outside simulated game ticks. This is evidence that the expensive synchronous work can be moved off the simulation thread, **not** proof that a real browser worker will always finish before the prior animals leave. No simulated gap was added to this candidate. A frozen native campaign and browser timing checks are still required before accepting it.

The intermediate `day13-v157-wave-key-diff.json` identified input index 10 (wave-context worker positions) as the sole changed entry-key input. `day13-v158-wave-key-stable.json` shows that narrowing that key plus a one-second gap reduced the tick to 48 ms, but the gap was removed in favor of the earlier preview. `pilot-v160-early-wave-prewarm` is a harness rejection because source was uncommitted, not a gameplay result.

Frozen 14-night native pilot (`pilot-v161-early-wave-prewarm-frozen`, source `fc017733`) compared with the same seed, strategy and policy in `pilot-v154-spatial-obstacle-index`:

| Day-13 native ticks | Baseline | Early preview |
| --- | ---: | ---: |
| Night maximum | 914 ms | 311 ms |
| Night p95 | 147 ms | 133 ms |
| Night summed CPU | 3,934 ms | 2,992 ms |
| Day maximum | 681 ms | 717 ms |
| Day p95 | 152 ms | 154 ms |

All 14 daily values for money, delivered crops, destroyed crops, living crops, planted crops, wages and player actions match exactly; both end with 828 coins. The pilot's entry transport accepted 21 requests and used 18. Its longest preparation wait was 12.36 seconds of wall time outside simulated ticks. Thus night simulation work improved, but overall loading time and real-browser frame delivery remain unproven. The day-13 daytime path spike is now the largest measured tick, so a 100-night run remains on hold under the user's performance gate.
