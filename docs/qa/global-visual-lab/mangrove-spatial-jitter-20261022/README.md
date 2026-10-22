# Mangrove spatial size plus moderate jitter

QA only. Starts from spatial-cover-response candidate and changes within-cell positional jitter0.25 to0.65 of module spacing for Mangroves only. Root offsets remain inside their cell; masks and water/occupancy/wear exclusions are evaluated at new positions. Nominal density and module geometry unchanged, but accepted counts can change at exclusion boundaries; controls.json records actual differences. Do not claim identical triangles.

Twelve matched day/night poses, no recorded page/GL errors or capacity overflow. Normal and reverse daytime views inspected: rows less apparent than size-only candidate, without the large gaps of prior0.95 jitter-only experiment. Broad homogeneous areas remain. Retain candidate, not native promotion or completed biome. Night/elevated supplied but perceptual review pending. GPU/CPU and movement validation required before selection. Water blue/moss and simulation untouched.

Reproduce: node tools/experiments/capture-mangrove-spatial-jitter-20261022.mjs with Vite5190. Compare mangrove-spatial-cover-response-20261022 and original reviewed-profile-20261022. No performance claim from static render counts.
