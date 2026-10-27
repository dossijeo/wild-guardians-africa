# Enclosure cut boundary: uncertified face versus unavailable geometry

The V1-pressure, topological-bot Sabana/712 campaign in experimental balance
PR #98 lost its crops after night 68. Its enclosure adviser returned
`movement-unproved` for cuts with two or three faces previously aggregated as
`unknown`. The native `lazy_cut_face_natural` contract distinguishes a face
whose continuous blockage is not certified (`0`) from an undetermined face
(`-1`); the JavaScript counter had merged them. Code `0` does not by itself
prove animal passage. This branch records the native code and coordinates for up
to eight unproved faces in a failed proposal. It does not change protection,
construction, spending or movement decisions.

## Reproduction and result

The diagnostic commit `deec04a2` was cherry-picked onto the PR #98 source
`c31e1bc4` in local replay commit `207dc3fd`. With the unchanged V1 candidate:

```sh
node tools/experiments/run-balance-candidate.mjs \
  tools/experiments/balance-candidates/v1-pressure.json \
  72 sabana 712 output.json topological
```

The replay completed 72 verified raids with zero issues. All 72 nightly
serialized-state hashes **exactly matched** the archived pre-diagnostic
Sabana/712 campaign. WASM, game, raids and runner input hashes also match.
The compressed [full replay report](sabana712-enclosure-face-replay-72.json.gz)
preserves source and candidate hashes, the daily ledger and the new face
diagnostics. That archived replay uses the original diagnostic field name
`open` for code `0`; the current code calls it `uncertified` to avoid
implying proven traversability. The baseline report is retained in
[PR #98](https://github.com/dossijeo/wild-guardians-africa/blob/codex/current-balance-candidate/docs/qa/military-wall-balance-search/current-main-repair-v1-topological-sabana712-100.json.gz).

Across 74 failed proposal attempts with face details through night 72, the
counter recorded 186 appearances of uncertified code-`0` faces and **zero** negative
or otherwise unclassified codes. These are repeated observations, not 186
distinct holes. On nights 70–72, the same three adjacent uncertified faces
recurred between `x=104` and `x=105`, at `z=-1`, `0` and `1`. The native code
for each was `0`. The bot therefore did not have a certified enclosure; its
refusal to construct or label that candidate protected was correct. Raids
destroyed 49, 42 and 40 crops on those nights, with zero wall hits. The
report does not prove that the animals crossed those exact three faces.

The local cut can place a boundary beside a cell whose discrete center is
non-traversable. That does not establish a continuous physical barrier along
the cell face. In `local-enclosure-cut.h`, proposal edges are created across
two passable cells, while the returned boundary also includes faces beside
non-passable cells. `cutFaceNatural` subsequently rejects a boundary face
unless a real solid, wetland, river or cliff covers it continuously. This
explains the kind of discrepancy observed without treating grid occupancy as
a physical certificate. The next change should determine whether these
specific uncertified faces can be closed by legal wall modules or whether the cut
must move around them; it must re-run placement, worker access and attack
certification on the resulting proposal. Reclassifying code `0` as a barrier
would be physically wrong.

## Frozen day-70 seam probe

A second replay captured the state at the start of Sabana/712 day 70. Its first
70 nightly state hashes matched the archived campaign. The three faces above
coincide with two ruined, zero-HP wall modules (`structure-78280` and
`structure-78281`) centred at `(104.5,-0.75)` and `(104.5,0.75)`. Wild Engine
correctly reports no certified barrier there. The native damaged-wall service
reports both ruins with a 10-coin repair cost each. Neither had a pending
repair task at the captured instant.

Before this branch's stroke fix, quoting the stroke from `(104.5,-1.5)` to
`(104.5,1.5)` returned zero modules: JavaScript deduplicated against the two
ruins even though they no longer block movement. After excluding nonblocking
ruins from stroke deduplication, the same quote returns two physically legal
modules costing 20 coins. Both a read-only preview and a paid build on an
isolated copy of the frozen state change the three local face results from
`[0,0,0]` to `[1,1,1]`. The paid build removes both old ruins and retains two
new modules. This proves that this *local* seam is constructible. It does not
prove that the entire enclosure is closed,
that workers retain access, or that crops cannot be attacked from other sides.
On confirmation, a newly paid module replaces a coincident ruined module in
the same transaction. The old ruin and any pending repair task are removed,
with zero refund. This prevents a later repair from creating two overlapping
solid walls. The same rule applies to single-module purchases.

The crop group currently near these walls has ID `crop:plant-77666`, whereas
the wall metadata stores older group IDs. The repair policy formerly sorted by
those old IDs' remembered values and then by wall ID, allowing old ruins to
outrank a fresh breach. It now prioritizes confirmed breach events in their
deterministic event order, with the most recent first, without retaining stale
crop-group valuations. The bot still decides whether its cash reserve permits
each ordinary repair request. This prioritization has a directed regression,
but its effect on an entire campaign is not yet measured. The experimental
planner must still pass full closure and worker-access certification before
buying a proposed enclosure.

## Verification

- Native cut/enclosure test file: 16/16 passed with the current WASM, including
  a new `0` versus `-1` diagnostic regression.
- Playable suite: 204/204 passed.
- `verify:balance` and `verify:plan` passed.
- The replay preserved all 72 serialized-state hashes and verified all raids.
- A wall-stroke regression verifies that a ruined module cannot hide a buildable
  slot while an intact module still prevents a duplicate.
- Replacement tests cover both chain and single-wall purchases, a pending
  repair task, exact payment, removal events, and serialization.
- A policy regression verifies that a recent breach receives repair priority
  over an old ruin even when its agricultural group ID changed after replanting.

## Sustained campaign comparison

The combined experimental code was replayed for 72 real nights with the same
Sabana/712 seed, topological bot and V1 military-pressure candidate. The frozen
control and the [new full report](sabana712-face-priority-safe-72.json.gz) carry
the same WASM (`b1c0f180…`), raids (`5b6b2113…`), runner (`7834ce5b…`) and
candidate SHA-256. The game, wall-stroke and bot-policy files differ exactly as
described above. Both arms completed 72 verified raids with zero recorded
physical/technical issues. The first nightly state-hash divergence is day 14,
so the later trajectories are strategic comparisons, not identical-workload
timings.

| Measure after night 72 | Control | Combined variant |
| --- | ---: | ---: |
| Living crops | 4 | 24 |
| Coins | 308 | 307 |
| Crop deaths from night 6 | 1,107 | 1,032 |
| Crop deaths, nights 70–72 | 131 | 43 |
| Wall hits, nights 70–72 | 0 | 56 |
| Animals generated across 72 raids | 896 | 839 |
| Wall purchase cost | 810 | 1,100 |
| Repair spend | 5,361 | 4,304 |
| Bot decision wall time | 276.33 s | 231.90 s |
| `Game.tick` wall time | 645.68 s | 652.05 s |
| Total experiment wall time | 1,005.75 s | 962.48 s |

The variant built certified general-cut enclosures on days 7, 23, 26, 35, 36
and 46. Each purchased proposal passed the existing movement, worker-access
and attack-occlusion checks before payment. This is evidence that the bot could
buy complete enclosures on this trajectory; it does not prove every crop stayed
protected at every later topology revision. The late wall contacts and lower
crop losses are consistent with useful defenses. The candidate also earned
less income (73,577 versus 86,067) and faced fewer animals after its farm
became smaller. Those workload differences prevent interpreting the wall-time
figures as an isolated speedup or attributing the campaign outcome to one of
the three code changes separately.

The combined variant is therefore a plausible functional improvement in this
seed, with a materially different agricultural and spending trajectory.
Independent seeds/biomes, a dedicated same-workload timing comparison and a
longer horizon are still needed before making a general balance or performance
claim.

## Gran Cañón: avoid buying a wall already scheduled for repair

The first combined variant above also completed the requested Gran Cañón/712
V1 check. At 14 nights it had 53 crops, 1,004 coins and zero crop losses from
night 6, versus 53 crops, 1,031 coins and zero losses for the established
event-driven maintenance policy. The [full 14-night report](canyon712-face-priority-safe-14.json.gz)
retains the hashes and repair records.

At 30 nights the [first combined variant](canyon712-face-priority-safe-30.json.gz)
ended with 47 crops and 801 coins, versus 55 crops and 950 coins in the
[established maintenance run](../topological-defense-repair-events/topological-repair-new-gran-canon712-30.json.gz).
It lost fewer crops to raids (17 versus 33) but bought 51 wall modules rather
than 19, spending 510 rather than 190 coins. The first variant repeatedly
paid for small certified enclosures on days 9–29 while ordinary repair tasks
could restore ruined modules. Thus the local stroke correction was physically
valid, but allowing the bot to replace repairable ruins immediately was a poor
economic choice in this scenario. Neither campaign had a technical issue.

The current policy therefore treats `repairableRuins` returned by the ordinary
wall quote as a reason to wait for its already enabled paid repair workflow.
The repair-completion event wakes enclosure planning again. A human can still
choose to replace a ruin immediately with a paid module; the confirmed build
retires the old ruin and cancels any stale repair task. The negative first
variant remains archived rather than erased.

The [repair-first 30-night replay](canyon712-repair-first-30.json.gz) completed
all 30 Gran Cañón/712 nights with no recorded physical or technical issue.
The replay used the same V1 pressure candidate, seed, topological policy and
WASM as the established maintenance control. Both arms followed legal actions,
but diverged in farm and raid workload; campaign times are not isolated
algorithm benchmarks.

| Measure after night 30 | Established control | Repair-first variant |
| --- | ---: | ---: |
| Living crops | 55 | 54 |
| Coins | 950 | 1,015 |
| Raid crop losses from night 6 | 33 | 26 |
| Wall modules purchased | 19 | 20 |
| Wall purchase cost | 190 | 200 |
| Repair requests | 175 | 149 |
| Repair spend | 1,200 | 991 |
| Animals generated | 245 | 223 |
| Wall hits | 561 | 490 |
| Bot decision wall time | 24.40 s | 22.17 s |
| `Game.tick` wall time | 119.98 s | 115.75 s |

The repair-first decision removed the repeated replacement spending observed
in the first variant. Its crop survival is comparable to the control and its
cash balance is higher, while attack workload differs. This single seed does
not establish general superiority; it does establish that the safety fix need
not force the poor 30-night economic trajectory seen in the initial replay.

## Manglares cross-biome check

The [repair-first Manglares/712 replay](manglares712-repair-first-14.json.gz)
also completed 14 nights without recorded physical or technical issues.
Against the [established maintenance control](../topological-defense-repair-events/topological-repair-new-manglares712-14.json.gz),
both had 5 raid crop losses, 173 wall hits, 43 paid wall modules costing 430,
and 54 repair requests costing 288. The variant finished with 127 living crops
and 895 coins versus 123 and 915. Nightly state hashes agree through day 13
and diverge on day 14. Measured bot-decision time was 28.55 versus 26.26 s,
and `Game.tick` time was 124.31 versus 112.96 s. This single, order-unbalanced
campaign timing cannot establish a performance regression; no speed claim is
made from it. It does show that the new repair decision did not alter the
wall-purchase or repair workload in this biome.

This branch remains experimental. The frozen probe establishes a specific
physically buildable seam, and the 72-night run establishes one sustained
campaign outcome. It does not justify changing military balance.
