# Remaining source color mips: separate diagnostic

The previous native source-color report and frame are archived unchanged. Their level0 observations remain separate: the negative source control persists, and no candidate was sampled or accepted.

The prospective `sourceColorMipTail` flag requests only mip1..last. For the observed2048×2048 RGBA/UNSIGNED_BYTE maps, all11 remaining mip rectangles total5,592,404 bytes per uniform, below the unchanged16MiB cap. Day/night256×128 textures request mip1..8, with level0 explicitly unobserved in this run. Unsupported samplers and framebuffer/read-pair failures remain unsupported; expected texture dimensions/mip counts still use source CPU metadata and the actual bound texture identity check.

No renderer, source pose, shader, texture/sampler parameter, repeat-selection or quantitative gate changes.30 original redraws and12 same-framebuffer reads remain. A new mock case verifies that the tail starts at1 and restores state without reading base0; three preceding restoration fault cases still pass. Real GL support, finite values and source variability require native evidence; matching observed tail hashes would not establish causality or approve adaptation.

URL: `http://localhost:5284/tests/browser/frontside-worker-visual.html?sourceTwin&controlDiagnosis&closedSubsetV1&sourceStateAudit&sourceGpuInputs&sourceColorTexels&sourceColorMipTail&noShadows&limit=1&cpuCampaigns=35912%2F49032%2F41320%2F41304-active-inventory-required`. Inventory must be verified before draw. This is a source-only diagnosis of the already invalid pose, not a new acceptance profile or reserved-view training for geometry.
