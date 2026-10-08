# Native .75 derived contracts, diagnostic only

Before any next reduction screen, inspect the rejected .75 proposal with the
same original/derived DoubleSide training arms. No FrontSide, shader expression,
maps, pose, camera or gate changes. This instrumented pass is not acceptance or
training from a reserved view; the quality rejection at8a2950f4 remains intact.

http://localhost:5284/tests/browser/frontside-crop-visual.html?blenderStemReduction&derivedContractAudit&limit=1&cpuCampaigns=49032%2F41320%2F41304-active-inventory-required

Root must substitute an authoritative pre-draw process inventory. The renderer
records actual color-draw program sources, active uniforms (including growth
height/ground/clock/wind and any bounds), textures and sampler state, attribute
layouts and matrices. One shared GL identity table across arms permits comparison
of actual program/texture objects. CPU snapshots additionally record native
material/map transforms/normalScale, texture/mipmap byte hashes where available,
tangent presence, bounds, iGrowth and instanceMatrix SHA256, and per-draw layout.
No GPU texels are read; GL queries can perturb timing, so no benchmark.

Static inspection: source GROWTH_POSITION uses uGround/uHeight from original
metadata, live uClock/uWind from its batch and iGrowth instance data; it does not
use geometry.boundingBox. Replacing geometry copies the same live iGrowth object,
while the original InstancedMesh/instanceMatrix remains. The original source
crop has no authored tangent or morph. These facts do not guarantee resulting
shader inputs or texture transforms; native draw snapshots are required.

Soil/leaf P/N/UV corner bits are asserted unchanged, but that assertion alone
does not prove derived texture TBN, transforms, uniforms, wind, raster precision
or occlusion unchanged. Do not attribute the RGB regions solely to displacement.
Bounds may change or become eagerly computed; distinguish metadata from active
shader uniforms and actual frustum usage. No original data or runtime imports are
edited by this diagnostic.

Analyze the saved native report with tools/frontside_crop_contract_compare.mjs,
archive report/PNG/console before overwrite, and preserve any incomplete/invalid
control rather than retrying to obtain an exact control.
