# Source telemetry for the next native control

The previous report counted material assignments, including shared materials and
materials without the HDR recipe. It therefore did not establish how many
compiled sources received the replacement.

The QA fixture now reports unique material UUIDs, types and names, observed
`onBeforeCompile` calls, and calls whose source contained the exact authored
recipe. ShaderMaterial source matches are reported separately: their replacement
can happen before the compile hook. A second snapshot after the culling sweep
includes hooks triggered by poses or newly visible meshes.

Three directed tests pass, covering the two authored recipes, shared materials,
unknown and uncompiled sources, repeated enabling, fresh activation epochs,
copied report counters, source restoration and original hooks/uniforms.

These are source-hook observations. Cached programs may bypass the hook; counters
are neither distinct GPU program counts nor proof of successful linking or
execution. Native readback, warning attribution and visual equivalence remain
pending. No production shader, skin culling policy or gameplay behavior changes.

No new browser scene was opened for this change while the impostor subagent was
measuring GPU cost.
