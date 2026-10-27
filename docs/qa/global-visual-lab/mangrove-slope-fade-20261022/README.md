# Mangrove slope-size fade: QA only

Adds 1-smoothstep(0.22,0.42,length(coverageSlope)) to leaf growth in the vertex shader, immediately before the existing hard slope exclusion. No instance, draw or triangle increase. Twelve real day/night frames; camera/time/draw/triangle controls equal selected reviewed profile; no recorded errors. Normal day reviewed: broad repeated leaf patches remain prominent. This treatment is insufficient to resolve the normal-view defect and is not promoted. GPU cost not measured; rejection is artistic, not performance based. The diagnostic hiding leaf geometry confirmed that layer contributes the pattern, but this slope experiment does not establish the primary cause. Next inspect coverage-mask shape and correlation between module orientation, tint and hash channels before increasing density or adding geometry.

Reproduce: node tools/experiments/capture-mangrove-slope-fade-20261022.mjs on Vite5190. Original defaults and accepted water/moss untouched.
