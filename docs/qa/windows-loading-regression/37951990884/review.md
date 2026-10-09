# Native post-crop diagnostic 37951990884

Source `411346e7`; build/installer pass, original primary smoke fails, minimization skipped. SHA256 receipt and original 149855-byte report retained. No timeout/recipe change.

The world reaches GPU preparation in this run, unlike 37949884630. Walls catalogue/prototypes complete in 235.7/4451.3 ms; VFX catalogue/texture/constructors complete in 209.8/2166.9/20.0 ms. These elapsed spans do not establish physical asset-provider cost or exclusive CPU.

132 readiness polls cost **8.1 ms synchronous wall total, maximum 1.0 ms**. Recent queries take 0–0.1 ms while two native programs (IDs20/23) remain pending. Thus high synchronous polling cost does not explain this run's timeout. Program type/material attribution is not recorded; IDs alone do not identify shader ownership.

At deadline, load-warm-gpu has been active15.947 s; nested warm-compile-world11.722 s; its nested union readiness barrier11.3565 s. Three earlier completed union barriers sum4.188 s, with staging awaited4.0675 s. Do not sum parents/children or interpret waits as GPU timings. 74 native compile submissions cost91.4 ms total/max9.9 ms. Pending readiness remains genuine; it is not bypassed.

ANGLE reports Microsoft Basic Render Driver D3D11 with KHR_parallel_shader_compile support and no context loss. Document visible/focused;1026 distinctRAF timestamps, max296.8 ms. Software environment is observed, but this single run does not establish its causal contribution or generalize to players' hardware.

Both smokes are still required. This diagnostic is not promoted, and the failed Windows gate remains open. Last successful original main smoke57527dc9 used the previous pipeline without the loading diorama; its90s gate was already identical, so failure is not an asserted smoke-hardening change.
