# Native source telemetry — image acceptance still inconclusive

In-app browser tab 664 loaded the current main 2821e878 scene from Vite 5183,
Gran Cañón, with preparation, planned reserves, experimental skin envelopes,
held-snapshot culling comparison and QA-only single-exit HDR control enabled.
The scene finished and was closed after report, console and screenshot export.
No performance timings were collected.

The report distinguishes 134 unique scene materials from repeated assignments:
48 observed compile hooks, 47 matching the exact authored HDR body. The remaining
hook belongs to a RawShaderMaterial whose original source matched and was
replaced before its hook; it is not evidence of a failed substitution. Four
ShaderMaterial sources matched before compilation. Uncompiled/cache-reused
materials are retained explicitly in the report. These observations do not
prove every GPU program linked or executed the replacement.

All five rigs were prepared. The framebuffer sweep still reports
`inconclusive-native-not-repeatable`: repeated native controls differ, so the
candidate cannot pass exact image acceptance. No tolerance or mask was added.
Logical state remains exact. Empty recorded warning/error logs do not establish
that the altered shader fixed a warning or caused the framebuffer variation.

The screenshot shows the restored original shader recipe after the sweep,
not its comparison buffers. Production skin envelopes and this shader variant
remain disabled. Broad visual, GPU and physical-mobile acceptance remain open.

Reproduce:
`/tests/browser/animal-preload.html?biome=gran-canon&prepare=1&plan-reserves=1&skin-envelope=1&skin-culling=1&skin-culling-hold=1&skin-culling-single-exit=1`.
