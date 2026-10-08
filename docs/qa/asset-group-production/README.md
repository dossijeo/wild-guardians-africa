# Production static group resize integration

Base commit64fdd26e; exact runtime/fixture snapshots and hashes are retained.
NativeAssetGroups now transfers private static attribute identities across color
group capacity changes after packing succeeds. A failed preparation disposes the
old geometry normally. A source array/layout/version change or private attribute
usage change rejects reuse;
the source is uploaded again. Ordinary retirement, prototypes and shadow groups
retain their existing ownership. Stable prepares allocate no transfer scope.
`reuseStaticOnResize=false` is an explicit QA baseline switch, not a UI setting.

Actual WebGL lifecycle compares legacy, production and QA subclass sequentially:
count8,9,17,4,8,9,4. Every resize requires6 bufferData calls in legacy and2 in
both new paths. All finish with0 observed live buffers/bytes and renderer
geometries; gl.getError() is0. This covers requested buffer lifetime, not all
physical GPU memory or textures/programs.

Native Gran Río/Musgum/high/seed712 controlled buffalo appearance at1280×720:
121 initial bufferData calls versus171 in both archived legacy controls; second
frame0, bufferSubData59 unchanged. Active matrices, coverage, group capacity/layout,
flags, renderer submissions and geometry/texture counts match both legacy controls
and both QA candidates exactly in the two observed frames. Full RGBA captures
retain identical alpha; maximum RGB mean absolute difference0.0001632 on the
0–255 scale. Max per-channel difference87 also occurs between original controls.
Residual image variation is retained, not declared bit-exact or causally explained.
Reports are compressed with the original drawing-buffer PNG embedded.

Scope: appearance-only paid centre, no crops/hiring/ticks/contact. No all-biome
visual acceptance, physical phone acceptance, GPU time or FPS improvement is
claimed. CPU times include observers and may overlap CPU campaigns, tests/builds.
The measured result is reduced redundant buffer submission. Reproduce the native
fixture as in the prior `asset-group-resize` receipt; omit the candidate flag to
use production, add `legacy-group-resize=1` for the old disposal route.

60 directed tests passed, including in-place source version updates, fallback,
failed packing, resource ownership, coverage, asset LOD/shadows and animal preload.
Production build passed (269 modules; existing bundle-size warning). The full
suite passed3,117 tests,0 failures/skips/cancellations (940.7 seconds);
`full-tests.log.gz` preserves its terminal output. Asset provenance,
plan and balance checks passed (24 sources/505 resources/126 exact SFX matches;
123,048 plan assertions). The built web package passed:701 files,403,014,155
uncompressed bytes,859 relative links and20 runtime GLBs. This check is not a
new itch.io ZIP publication.

Additional native Gran Cañón/Mapungubwe/low/1280×720 appearance-only regression
loads all five species with ready rigs, unchanged animal downloads/programs
and no fixture errors. It retains a full native report/capture, but is not a
paired image benchmark or a complete raid/pathfinding/night test.
