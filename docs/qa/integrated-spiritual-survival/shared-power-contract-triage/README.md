# Shared-power integration: contract and ledger triage

Starting revision 6946b765. Five-file selection ran 73 tests, 66 passed and seven failed; the complete negative output is retained. No production gameplay, strategy, economic or military parameter changed in this correction.

## Six explained failures

Two single-plant Growth expectations assumed full original intensity and four applications to maturity without the later required watering. The independent oracle now computes marginal E(T)=180*T/(180+T) for two requests; the worker-free unit fixture explicitly supplies required manual checkpoint water and verifies per-plant committed power <=15, unchanged RNG, persistence and maturity after additional ordinary time. It does not credit this fixture watering as campaign/player activity.

The balance integrity oracle omitted the explicitly approved one-hit crop resistance. It now requires crop_hit_points=1 while retaining the full original-balance comparison. Two worker displacement fixtures constructed raids without the individual reservation map. Their empty native-shaped fixture now supplies reservations:{}; no runtime fallback or workforce behavior changed.

The native Desert/Suajili nine-night landing test reached its expected final state, then failed in auditIntensiveFarm because delivered crates were compared only against base value. Native delivery separately settles Multiply income. The auditor now checks the exact rational sum of base crate value plus actual settled integer bonus, requires nonnegative integer bonus and real settled power for positive extras, and retains whole-ledger reconciliation, unique crops, maturity, watering, persistence and actual delivery counts. No simulator decision changed.

Two new native-worker tests verify real ordinary delivery (11 coins) and diluted Multiply delivery (21 coins). Omitting the actual bonus or marking it unliquidated must fail the auditor. The original worker harvest/carry/delivery is executed, not a synthetic ledger entry.

## Rechecks

- Core/workforce/single-plant/shared-power: 59 pass, zero failures/skips.
- Native delivery auditor regression: two pass.
- Desert/Suajili nine-night landing replay plus illegal-landing guard: two pass, zero failures; native replay wall time ~66 seconds on this run. This is technical QA, not a statistical balance campaign.

The separate initial 19-test magic run is retained but overlaps the 59-test selection; do not add their counts as unique coverage.

## Pending

QA-134 still returns victory where its old low-capital final-night fixture expects defeat. The changed outcome is preserved and is not yet classified: its economic assumptions and actual last-night damage require inspection. No assertion or damage value was changed to force defeat. Original 72-failure full-suite history remains retained; no updated full-suite pass, 100-night campaign approval or merge to main is claimed. Running campaigns remain frozen in their own worktrees.
