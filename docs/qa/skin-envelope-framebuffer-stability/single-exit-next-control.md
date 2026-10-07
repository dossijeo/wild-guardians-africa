# Prepared single-exit shader control

The animal-preload fixture now accepts `skin-culling-single-exit=1` alongside
`skin-culling=1` and the existing envelope pilot and comparison flags. It applies
the existing QA-only single-exit environment recipe to scene materials, renders
twice at dt=0 before the comparison, verifies unchanged serialized simulation,
then restores the original recipe in a finally block and renders again.

This prepares the next diagnostic for the unresolved native/native framebuffer
variation. It does not change production shaders or enable tighter skin bounds.
The reported material assignment count includes unmatched materials and shared
references; it is not proof that a shader body was replaced in every material.
Shader compilation and warm-up are outside the paired captures. Compiled QA
programs may remain cached until the test page is closed.

The existing two recipe/toggle unit tests pass, including original ShaderMaterial
text restoration and distinct cache keys. The extracted fixture module passes
`node --check`; `git diff --check` passes. Native-browser execution of this new
flag is still pending while the impostor agent owns the GPU. These checks do not
prove pixel repeatability, warning elimination, visual equivalence or GPU speed.

For the next run, collect a fresh console log and retain the complete 25-pose
report. Require exact native/native control pixels before evaluating candidate
bounds. Do not infer that the existing ANGLE warning causes differing pixels:
all original GLSL branches assign their return values, and the warning alone
does not establish a rendering defect.
