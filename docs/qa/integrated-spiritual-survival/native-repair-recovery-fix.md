# Preserve actual native recovery in repair allocation

After v116 ended and its originals were archived, the QA player policy now uses
the existing native `dawnMinimum(state)` when allocating repair money. A breached
farm with no living crops or undelivered crates reserves 35 coins, not just the
30-coin wage. A breached farm that still has economic resources keeps the original
30-coin minimum; an unbreached perimeter also retains the requested larger reserve.

This changes only repair requests made by the automated player. Prices, wage
rules, HP, damage, FIFO, repair execution, crop income, RNG and production are
unchanged. No money, plants or repairs are granted. Existing campaign sources and
results remain recoverable from their recorded commits/manifests.

The native recovery regression starts with explicitly synthetic damage and 157
coins after hiring. Native wall prices total 125 coins. The policy admits only
115 coins of repair tasks, buys a real 5-coin replacement seed, saves/reloads and
lets the native worker complete and pay the admitted repairs. The resulting cash
is 37 coins; no HP or income is fabricated. This is an isolated functional test,
not evidence of survival or an alternative replay of the complete v116 campaign.

37 focused tests pass: native recovery, breached funding, paid defense policy,
actual mixed-material purchases/reconstruction and prospective metadata ownership.
The existing synthetic reserve fixture now explicitly includes an intact center
and living economic resource; its ruined-wall mutation uses identity rather than
an index shifted by that added center. Those changes preserve its intended native
30-coin case. Evidence: `native-repair-recovery-regression-tests.txt`.

Another native campaign must validate recovery and the broader contraction before
this can support 100-night balance acceptance. The previous 30-night defeat,
failed activity proxy and all terminal evidence are retained unchanged.
