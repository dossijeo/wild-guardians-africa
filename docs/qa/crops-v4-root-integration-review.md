# Root integration review: authored V4 crops

Reviewed PR17 head `bb629a3830e6f85e616aceb0c942129f625ae09e` on
2026-10-09. This records review before merge, not production activation.

The runtime diff selects FrontSide for authored V4 colour, shadow and custom
depth materials while retaining the legacy V3 path. The 32 baked bridge
templates are loaded through the normal Assets owner; WorldScene awaits them
before building crop batches. The loader rejects missing/duplicate bridge
indices, and the batch validates matching endpoints and morph attributes.
The authored topology is not reconstructed from steady templates at runtime.

Root reran the V4 verifier on this immutable head: eight species, five states,
32 bridges, finite attributes, Front colour/shadow/depth, actual native
dispatch and resizing at 65/128 all passed. Six directed package/catalogue
contracts also passed. The package test derives its source inventory
independently from public/assets and still checks unique source/runtime
mapping; it does not replace the old fixed count with a weaker assertion.
The SFX refresh changes two source hashes and reference lines, retaining
original audio bytes and assignments.

Root reran the archived native verifier: session942 hashes and its night/
restore fixture failures remain retained; corrected session943 verifies
night lighting, eight plants, 72 Front materials, exact restore with a fresh
canvas, no reported errors and cleanup. Root's earlier screenshot inspection
is limited to those captured views; it is not exhaustive human acceptance.

Loading integration must await the additional 26,536,168-byte bridge asset.
Reuse the same Assets owner and identical logical URL for diorama/world to
avoid duplicate download/decode, and preserve the feature's cooperative batch
API when merging. Diorama cleanup must not release shared world resources.
Earlier V3 loading timings do not validate this V4 integration.

At review, PR17 Validate and Windows checks were still running. Merge remains
pending their terminal results; passing directed checks does not substitute
for the complete regression run.

## Integration update

Validate run37905454848 on `bb629a38` subsequently completed successfully:
3383 tests / 3383 passes / zero failures, build and packaging passed, 704
files / 443925570 bytes / 860 relative links / 22 runtime GLBs. Root inspected
the terminal run and its log rather than inferring success from an earlier
directed check.

The user then explicitly instructed root not to wait for Windows before
merging. PR17 was merged with the expected-head guard into
`81d87953bf054e2478f6227cf07f06b06634949f`; root pulled main with fast-forward.
Windows run37905454830 remains a separate live acceptance check, not a claimed
success. On the merged main, root reran the V4 verifier and 17 crop morph,
catalogue and package contracts, all passing. The loading agent is merging
this base into its feature and will validate shared V4 assets before promotion.

Root's post-merge local build passed in 8.71s (existing large-bundle warning);
the freshly built package passed with the same 704 files, 443925570 bytes,
860 relative links and 22 runtime GLBs. The immutable bb629 terminal Validate
metadata/log extract and the historical live Windows snapshot are retained
in `crops-v4/ci-bb629-terminal/`; root independently checked all three file
hashes against the receipt before and after copying. The Windows snapshot
is not terminal acceptance.

Windows run37905454830 subsequently completed successfully on immutable
`bb629a38`. Root inspected the verifier and reran it before and after copying
the retained evidence to `crops-v4/ci-bb629-terminal/`. Original v7 JSON sizes
and hashes match official artifact metadata: smoke2829 bytes and visibility
110225 bytes, both ok:true/errors:[], with 22 distinct runtime GLBs. The
21 simulation fields remain exactly equal through 300559.6ms of genuine
native hiding; the menu pause persists on restoration and simulation resumes
for approximately one second afterward. Earlier live snapshots remain
historical, not the current result.

This closes Windows CI acceptance for the V4 crop head. It does not validate
the separate interactive-loading branch, every culture, audible sound, GPU
performance, physical mobile devices or the whole master-plan objective.
