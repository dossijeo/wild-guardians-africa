# Separate live growth binding probe

The native 880 sequence restores source/candidate geometries and save contexts but remains paused at fully mature growth. The source sampler sets sy, sr and open to 1 for growth ≥1, so increasing a fully mature plant's growth value does not exercise a changing `iGrowth` upload.

The next prospective probe will use the native incoming state05 before maturity, at fractions .97, .985 and 1, after verifying actual native sample phase `original` and stage 4. It will preserve the initially selected target ID and position on a QA copy, not ask the mature-only focus selector to reroll after reducing growth. Both arms use the same explicit input values. This is a functional input experiment, not elapsed gameplay or a completed growth campaign.

The prepared `frontside-live-growth-buffer-probe.mjs` is not imported by the current viewer or timing fixtures. It creates no context. It observes the selected mesh's actual native draw, looks up the active program's `iGrowth` attribute, records layout/divisor/buffer token and CPU version/bytes, and reads the bound VBO bytes with WebGL2 `getBufferSubData`. Its temporary ARRAY_BUFFER binding is restored in a finally block; draw calls remain delegated. Source and candidate must both show changed CPU hashes across input fractions and zero CPU/GPU byte differences in the captured active draws.

Capture is disabled by default. The future controller must arm it only around explicit synchronous World renders, then disarm immediately, retaining the buffer-token registry across controlled release/reinstallation steps. Background RAF draws must not consume the coverage budget. Limits are 64 observed draws and 2 MiB of readback, with skipped-limit and exhausted-budget diagnostics retained. These are bounded instrumentation choices, not performance or visual thresholds.

Three r180 supplies this contiguous vec4 with explicit 16-byte stride; the equivalent WebGL implicit stride 0 is also supported. Other layouts are diagnosed as unsupported rather than silently misread. Only `iGrowth` is observed. Other vertex buffers, textures, uniforms, shader output and physical VRAM are outside this probe's scope. GL object tokens are meaningful within a single context, and are reset after a new context/save rebuild.

The module queries and reads GL synchronously and intentionally perturbs execution. It must be disposed before any timer-query campaign. Correct buffer bytes alone do not approve appearance, animated continuity or GPU improvement. The existing ownership report and CPU registry tests remain separate evidence; their buffer tokens are not native GL tokens.

Two CPU mock contracts passed with exit 0 (0.410 s command duration), in a coordinated window after loading 137/138 closed. The receipt is next-instruments-cpu-contracts.json. They exercise matching data, a stale upload, a subsequent updated upload, binding restoration under failure, draw delegation, disarmed background draws and explicit readback budget exhaustion. No native probe has run yet.

