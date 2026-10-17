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

This branch remains experimental. The frozen probe establishes a specific
physically buildable seam; a full campaign comparison and repair-priority
outcome check remain before adopting the planner change or adjusting balance.
