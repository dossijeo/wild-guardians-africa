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
