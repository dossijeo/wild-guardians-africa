# First-crop native upload metadata

Trace80; production runtime `08fe1462`, opt-in tracer `d36f3854`. Same Sabana/Mapungubwe medium setup as78/79, CSS1280×720/world1600×900. Head3aa5 adds only unimported QA helpers. This is attribution, not a timing acceptance or controlled comparison.

Both expensive texSubImage2D calls submit ImageBitmap2048×2048 atlevel0 toTEXTURE_2D. The native shadow draw reports the material's assigned color map atthose dimensions: maizeSource23, milletSource22. The images correspond to the two base-color atlases from the native cropGLB. They are already ImageBitmap; replacing an HTMLImage upload path is not a justified remedy here.

Maize: draw208.4ms; shadow renderBufferDirect186.5ms; texture submission85.4ms, getShaderInfoLog49.1/5.8ms, getProgramInfoLog14.9ms and getProgramParameter(LINK_STATUS35714)27.2ms. Millet: draw90.3ms; shadow draw78.2ms and texture submission77.7ms. These nested timings must not be added to the total. The selected actual shadow-program cache key is identical for both species:

```
depth,highp,srgb-linear,false,,uv,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,,false,false,0,,1,0,0,0,1,0,1,0,0,0,0,2,0,0,0,3201,3,142336,srgb,bioma-growth-depth-v3-opaque
```

This gives a concrete key for verifying the program-only candidate. Source inspection shows visible-only world-depth preparation skips the invisible count0 crop batches, while native shadows assign the source color map and use the shadow target/no-fog recipe. The candidate may prepare that recipe without drawing/uploading all hidden geometry. It does not solve texture-first-use costs by itself.

Resources/first-use alternatives still require measurements. Retaining existing native texture storage through the original Texture owner may avoid deleting the maize atlas at handoff without duplicating Source/pixels, but must be verified for sampler identity, peak resources, cancellation and empty/dense farms before any promotion. Uploading every dormant crop texture unconditionally must not be assumed memory-neutral.

Report retains the raw trace/intervals/LongTasks. Loading also has one >100ms interval; no acceptance gate is silently waived. Total initialization18,392.5ms and control22,580.8ms are a single unpaired run. Logical/restored/camera checks pass; errors[], disposed/contextLosttrue, tab80 closed and browser2 inventory empty before root's next window. No additional GLqueries or resource probes were used.
