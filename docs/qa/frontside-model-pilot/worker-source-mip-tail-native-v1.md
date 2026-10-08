# Native remaining-mip source diagnostic

Root executed frozen09d1747abbabd7bd719056980feab679648ead04 in tab783, preserved18 sources/report/frame/browser, then closed/disposed the scene. Own raw report is byte-identical to root's `docs/qa/frontside-native-inputs/worker-mip-tail/report.json`. Console warnings/errors empty; four CPU campaigns35912/49032/41320/41304 confirmed alive, no own Blender/tests/GPU. No benchmark or candidate samples.

31 Mesh0 draws read all requested mip1..11 of map/normalMap/roughnessMap/metalnessMap:5,592,404 bytes per uniform, within the unchanged16MiB cap. Recorded fingerprints of each observed rectangle are equal across captures. Environment day/night mip1..8 are also observed equal,43,692 bytes per uniform. Bone/depth remain unsupported in this color instrument. The level0 and mip-tail results are two separate executions; combining them does not establish simultaneous complete GPU texture equality. Dimensions/mip expectations use CPU metadata, FNV collisions are possible, and actual per-fragment shader sampling/raster behavior is not observed.

12 same-framebuffer synchronous reads remain exact.30 source redraws continue alternating0/21 changed bytes, maximum59, alpha0, tile0.010757437286277613. Source control stays invalid, original reserved sample remains invalid, and no cause or model adaptation is approved. No thresholds/renderer/repeat-selection changes follow from this observation.

Geometry work continues independently: source boundary/interface ambiguity must be understood before winding flips, caps or new geometry. This input investigation cannot replace rig/UV/animation/material preservation, multiview/shadow quality or net GPU gates.
