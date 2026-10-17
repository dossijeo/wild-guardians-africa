# Enclosure cut boundary: open face versus unavailable geometry

The V1-pressure, topological-bot Sabana/712 campaign in experimental balance
PR #98 lost its crops after night 68. Its enclosure adviser returned
`movement-unproved` for cuts with two or three faces previously aggregated as
`unknown`. The native `lazy_cut_face_natural` contract distinguishes a known
unblocked face (`0`) from an undetermined face (`-1`); the JavaScript counter
had merged them. This branch records the native code and coordinates for up
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
diagnostics. The baseline report is retained in
[PR #98](https://github.com/dossijeo/wild-guardians-africa/blob/codex/current-balance-candidate/docs/qa/military-wall-balance-search/current-main-repair-v1-topological-sabana712-100.json.gz).

Across 74 failed proposal attempts with face details through night 72, the
counter recorded 186 appearances of known open faces and **zero** negative
or otherwise unclassified codes. These are repeated observations, not 186
distinct holes. On nights 70–72, the same three adjacent native-open faces
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
specific open faces can be closed by legal wall modules or whether the cut
must move around them; it must re-run placement, worker access and attack
certification on the resulting proposal. Reclassifying code `0` as a barrier
would be physically wrong.

## Verification

- Native cut/enclosure test file: 16/16 passed with the current WASM, including
  a new `0` versus `-1` diagnostic regression.
- Playable suite: 204/204 passed.
- `verify:balance` and `verify:plan` passed.
- The replay preserved all 72 serialized-state hashes and verified all raids.

This is diagnostic groundwork for a physical planner correction. It does
not by itself make the late Sabana enclosure constructible or justify a
balance change.
