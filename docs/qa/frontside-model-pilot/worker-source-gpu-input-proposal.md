# Next source-input and capture isolation (no native result yet)

After original noShadows variation persists, inspect actual bound vertex/index
buffer bytes and original bone texture values without changing source geometry,
materials, shader expressions, camera or pose. The current .75 contract fixture
and shared source helper at25210ffc are preserved by the prior commit. This
new diagnostic has no native results, candidate draws or acceptance interpretation.

Prepared helper frontside-source-gpu-input-audit.mjs enumerates active bound VBOs
and index buffer, reads each via COPY_READ_BUFFER/getBufferSubData, fingerprints
actual returned bytes and restores COPY_READ_BUFFER binding. The readback limit
is32MiB per buffer. FNV fingerprints are diagnostic, not collision-free or source
preservation proofs; compare CPU and GPU scope explicitly, never merge them.

If the source bone texture is Float32 and EXT_color_buffer_float exists, the
helper temporarily attaches the *existing bound* boneTexture to a READ framebuffer
and reads RGBA/FLOAT only after FRAMEBUFFER_COMPLETE. It records completeness,
extension availability, dimensions, CPU/GPU fingerprints and nonfinite returned
float values; unsupported formats/extensions remain unobserved, never a pass.
Original read framebuffer/read buffer and active texture are restored; the
temporary framebuffer is deleted. No source data, texture filtering or draw
program is written. Enabling the float-color extension and synchronous readbacks
can perturb behavior/timing; this is expressly not a performance measurement.

New source-only guards require sourceTwin/controlDiagnosis/sourceStateAudit,
noShadows/limit1. The fixture captures one original
framebuffer followed by12synchronous gl.readPixels calls with NO draws/updates/
RAF/promises between them, then30ordinary original renders/readbacks with GPU
input fingerprints per render. Keep source-only noShadows and verify uOn0; never
compare a candidate or reuse this altered pass as independent V1 acceptance.

Static normal/environment/depth textures are not read by this helper. Exact GPU
buffer/bone and fixed framebuffer bytes would not prove normal-map derivatives,
texture fetches, rasterization, precision or driver execution causal equality.
If source variation persists, describe what was captured and which hypotheses
remain; do not blame ANGLE warning/CPU load or modify production shader math.

http://localhost:5284/tests/browser/frontside-worker-visual.html?sourceTwin&controlDiagnosis&closedSubsetV1&sourceStateAudit&sourceGpuInputs&noShadows&limit=1&cpuCampaigns=20024%2F49032%2F41320%2F41304-active-inventory-required

Update the process label with an authoritative pre-draw inventory. Analyze with
tools/frontside_source_draw_compare.mjs; archive report/PNG/console before another
run. Include float extension/FBO status and unsupported readback limits; do not
label unavailable contents as equal. No CPU/GPU timings.
