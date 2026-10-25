# Populated Desert: unequal workload cause isolated

Two repeated media runs, same serialized fixture/camera/time,90 stable frames before measurement. Instrumentation wraps renderer.render and records calls,triangles,target and caller stack; timings contain instrumentation overhead and are NOT performance results.

First repetition: sky + main scene. Second: sky + full-resolution depth capture + main scene. Additional depth pass day56calls/319639tri, night59calls/329217tri. Stack identifies BuildingDestructionPass.captureDepth via scene.js depth-required gate, not a different terrain quality. The gate ORs work/attack/shield/agriculture/material/locomotion effect preparation. Specific requesting effect not yet identified. Main scene also differs slightly (102 versus105 draws day), so depth is a major cause, not proof all differences explained.

Do not disable effects to manufacture a favorable benchmark. Next inspect effect readiness and loaded state before first simulation tick; ensure equivalent effect state or explicitly measure separate identical effect scenarios. No simulation/runtime changes. Retain approved Desert shadows and full backgrounds.

Raw instrumented records and compact pass-summary.json contain evidence. Reproduce audit-desert-populated-passes-20261022.mjs. It intentionally records call stacks and must not replace the normal performance harness.
