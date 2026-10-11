# Wall closure and interrupted tutorial regression

## Reproduction and correction

On the main source, a paid three-sided 8 m enclosure subsequently closed with
a paid fourth stroke creates an automatic gate, but a worker at (0.1, 4) does
not return after 400 movement steps. This reproduces for all five materials.
The worker's collision body overlaps two contiguous modules at their seam.
The same test starting at (4, 4), clear of the walls, finds the gate normally.
This identifies one concrete reproduction of the reported symptom; it does
not establish that every conceivable enclosed-worker failure has this cause.

The return controller reuses the bounded overlap recovery previously developed
in experimental commit 2d7206cb, without importing the experimental economy or
horde changes. Recovery now handles a collinear union of adjacent modules:
leave its nearest face continuously, then follow an ordinary native route to
the village. It neither teleports the worker nor removes a wall or changes the
door. Other solids, fluid, terrain, props, gate leaves and animals remain checked.
Intersecting non-collinear solids are not interpreted as one wall.

After failed bounded overlap/slope recovery, an invalid origin no longer starts
a wide return search. The regression observes zero wide searches across 200
native ticks in the deliberately blocked case; removing the obstruction then
permits return. This is an operation-count assertion, not an FPS benchmark.

Opening an interface surface explicitly interrupts the displayed guardian:
stop its media edge and call its normal dismissal callback once. Dismissal
records the ID in the existing daily history even if its presentation was
queried without recording. Background hiding remains temporary. The next
pending message is not marked shown merely because the current one was closed.

## Validation

- 128 focused automated tests passed: doors, native frame collision, natural
  boundary gates, mixed-material edits, overlap recovery, return searches,
  tutorial daily history, narration duration and action guidance.
- Ten new paid native cases cover both clear and seam origins across all five
  wall materials. Each exits via its automatic gate, preserves ledger/walls,
  resumes through a real snapshot roundtrip, reaches home and allows the same
  person to be hired on the next native dawn. Night attacks are disabled in
  this isolated navigation fixture; it is not a campaign balance acceptance.
- Production build passed (76 seconds on this concurrent-test machine), with
  the existing large-chunk advisory. No loading-time improvement is claimed.
- Browser v2 passed at 1280x720, 390x844 and 844x390. Native paid closure and
  original wall/worker meshes are used on a flat isolated field. Desktop
  visual inspection confirms the worker inside the actual ring before return,
  and outside after using the door. Tutorial uses the real DOM guardian and
  controller with a deterministic media stub; actual voice playback and a
  physical mobile device are not certified by this test.
- The first browser attempt retained in `browser/` and `browser-run.txt` failed
  because its QA panel covered a portrait control; its wall transforms also
  needed correction. Those are QA fixture defects, corrected for `browser-v2/`.
  Only browser-v2 screenshots are current visual evidence.

The first CI suite finished with 3,980 passes, two failures and one skip. Both
failures were the generated SFX catalogue checks: this fix shifted source line
references and hashes while the stored inventory still described the old code.
The inventory was regenerated and compared with its predecessor, removing only
line references and source hashes for the comparison. All other fields,
assignments, categories and exact audio hashes remain identical (126 sounds,
100 assigned, 26 unassigned). All three catalogue tests now pass. The original
failed CI log is retained compressed; a fresh CI run is still required.

Windows CI passed for runtime head `c6db2c09`, including packaged WebView2
loading, genuine minimization/restoration and manual save confirmation after
IndexedDB commit. Downloaded original JSON artifacts and their hashes are in
`windows-ci/`. World readiness waits were 154.8 seconds for smoke and 136.9
seconds for visibility on the CI runner; these are functional observations,
not an isolated loading-performance comparison or physical mobile acceptance.

The local full suite is also running against its original launch; its pending
log is not staged as a passed result or relabeled as the regenerated inventory.
The independent 100-night campaign retains its frozen original source and is
unmodified. These fixes must not be described as changes already applied to
that running campaign.
