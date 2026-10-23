# Raised fern composite LOD: static review

Source56de4f3f8 plus QA files here. Same Blender composite maps as the flat diagnostic; only far surface changes to a9vertex/8triangle shallow radial patch (root0.056m, axis vertices0.32m, corners0.22m). Current near fern geometry remains32triangles. Native code is untouched. User requested retaining this approach after viewing the result; engine-baked lighting remains an optional future alternative, not a mandatory new direction.

Sixteen real medium1280x720 seed712 screenshots: native/candidate,day/night,close/game/reverse/topdown. review-fern-raised-lod-20261023.py verifies all eight pairs share camera,target,time,origin and near/far instance counts, no captured errors. Candidate reduces final world-pass triangles by34056/36576/48696/43008 respectively; draw calls match72/83/65/38. No density reduction. Close/game/reverse share the original distance selection; topdown at38m altitude still selects2068near/1792far because current LOD uses XZ distance. Thus camera-inclination/projected-size selection has not yet been implemented.

Reviewed daytime close and topdown side-by-sides: raised shape retains more presence than the previous flat card, but distant shading/shape still differs; do not call pixel equivalent. Original approved fronds remain left, candidate right. Static images do not establish smooth transitions or GPU savings. Pending: timing, continuous transition inspection, and selection accounting for projected size without hiding visual differences.

Reproduce: node tools/experiments/capture-fern-raised-lod-20261023.mjs, then python tools/experiments/review-fern-raised-lod-20261023.py, with Vite5190. QA route imports qa-fern-raised-lod-20261023.js; production never imports it. No simulation changes.
