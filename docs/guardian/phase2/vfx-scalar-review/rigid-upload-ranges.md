# Active rigid-particle upload ranges

VFX preparation previously copied and dirtied the full 256-instance buffer for every rigid shape, even when its active count was zero. It now copies only count*23 floats and marks exactly that update range; empty shapes do not increment the upload version. Mesh instance counts and visibility continue to update so expired particles cannot remain drawn.

The existing all-18-compositions test checks native packed values against uploaded active rows. Added assertions for exact update ranges and unchanged empty-buffer versions. All 21 native/rendering tests pass; the modified rendering suite passes all 12 tests. This preserves particle generation, transforms and appearance data; no measured frame-time improvement is claimed. First-time GPU buffer allocation still allocates capacity, and the savings apply to subsequent buffer updates.

## WorldScene visual repeat

Recorded day Grow/Multiply and night Shield/Attack after the upload change, using real commands, camera orbit/zoom and consecutive casts. Inspected two-second contact sheets: spell particles remain visible and transient Guardian presentations disappear; the night shield persists as intended. Day includes a distant arrival close to the top edge, retained as a framing issue rather than calling the entire visual matrix passed. Files spells-upload-day/night contain the recordings and final statuses. This is not a pixel-parity proof for every effect frame or a performance comparison.
