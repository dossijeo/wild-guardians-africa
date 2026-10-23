# Far-only prelit fern visual review

Native left,hybrid right.16real screenshots,seed712,1280x720,medium,close/game/reverse/topdownday/night.8pairs match camera,target,time,origin and near/far counts; no captured errors. Static world-pass triangle reductions31218/33528/44638/39424, one additional color draw for far ground shadow. Near geometry/material/animation code untouched. Close daytime pair inspected: foreground fronds retain their shape, distant shading/shape still differs. This is not image equivalence or a temporal transition test.

Reproduce: node tools/experiments/capture-prelit-far-fern-20261023.mjs and python tools/experiments/review-prelit-far-fern-20261023.py. Engine-baked atlases from fern-native-sprite-bake-20261023 required. Cost result in ../fern-prelit-far-cost-20261023 does not support promotion. Approved native Mangrove art remains intact.
