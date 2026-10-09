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
No native GPU comparison or resource/readback acceptance is recorded yet.
