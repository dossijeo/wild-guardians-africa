# Zero-vertex upload experiment — acceptance pending

This is an explicitly enabled QA experiment, not a production optimization.
The existing viewport-zero draw still processes potentially millions of
vertices. Native paired QA found a 52.607 ms isolated preparation outlier;
that observation alone does not establish the cause of a moving-camera frame.

`withZeroVertexUpload` temporarily intercepts `renderBufferDirect` only during
the synchronous isolated upload draw. It retains the original renderer call,
camera, scene, geometry, material, object and index selection. The geometry's
draw range and the passed group range both become 0/0 for that call. Each
group therefore has a nonnegative, zero intersection and still reaches the
installed Three r180 `bindingStates.setup`. Merely setting the global draw
range count to zero would yield a negative intersection for later groups and
skip their binding setup. Original groups and draw-range identity are retained;
the borrowed range and renderer method are restored even if drawing throws.
No scope survives an await. Ordinary rendering uses the original positive
ranges. Shader compilation, texture uploads, owner checks and GPU fences retain
their current contracts. Shadow generation is excluded by required isolation.

Enable only via the DEV actual-app flags
`?qa-loading&qa-loading-zero-vertices` or the standalone native fixture's
`zero-vertices` flag. Without the explicit flag the previous recipe remains.
The progress report records the requested policy; GPU draw metadata is needed
to establish execution. The preparation result counts intercepted calls.

Required native validation before adoption:

- Compare the same source, archived farm, resolution and camera in AB/BA.
- Measure preparation draws and the first positive visible draw separately;
  retain all RAF intervals and CPU costs, pending/disjoint/unresolved queries.
- Verify indexed, non-indexed, instanced and multi-material group bindings.
- Compare images and native bone/morph/material/UV behavior without reducing
  resolution, geometry, visibility or shader quality.
- Compare resource uploads/capacity and cleanup in separate resource probes;
  requested buffer/texture capacity is not physical VRAM or peak RAM.
- Exercise cancellation, context loss, errors and repeated loading, with
  synchronous restoration before any fence/frame wait.

A fence only establishes completion of submitted work. The driver may defer
pipeline or vertex work until a positive draw, so passing the fence is not
sufficient evidence of a warmed visible scene or improved loading fluency.

Initial CPU validation: 68/68 tests passed across
`zero-vertex-upload.test.js`, `native-far-gpu.test.js` and
`loading-progress-qa.test.js`. Build passed with 321 modules and the existing
large-chunk warning. These checks ran while root's full CPU suite was active;
their durations are functional diagnostics, not isolated performance evidence.
Native four-arm A/B/B/A evidence is now retained in
`zero-vertex-AB-dd0f51d0-summary.json` and
`zero-vertex-BA-dd0f51d0-summary.json`, with raw loading, ordinary gameplay
and actual Save-and-return audio cleanup reports. All four used runtime
dd0f51d0 and independent temporary archive copies at 1280x720. The main
Desert fixes were not merged into this frozen comparison.

Far preparation GPU p95 was A1 8.999, B1 0.500, B2 0.529, A2 5.653 ms;
all B preparation draws reported zero triangles. The first positive native
world draw retained 2,676,866 triangles in all arms, without an extreme new
GPU stall in those observations. This does not establish general pipeline
warmth. Cinematic and complete RAF results were mixed, including higher B
outliers; the four-arm table retains those negative results. No global
fluency, total-loading or production acceptance follows from this targeted
envelope change.

Resource/readback and expanded native cancellation/context-loss/repeated
lifecycle acceptance remain pending. The requested-resource fixture restores
both QA preparation flags at verified readiness so later ordinary gameplay
has the same policy in both arms. The temporal readback fixture has an
explicit zero-vertices option, preserving the default recipe and recording
zero triangles and direct-method restoration; it has not yet been exercised
natively for this option. No physical peak RAM/VRAM neutrality is claimed.
