# Native source-only GPU input diagnostic

Status: **SOURCE CONTROL INVALID, NOT APPROVED**. Root executed frozen `a73ad920` sourceTwin/controlDiagnosis/sourceStateAudit/sourceGpuInputs/noShadows limit1 in tab 779, exported the evidence and closed the scene/tab. No candidate sample or timer query was run.

Root report and authoritative worker POST share SHA256 `8a0208feb763d90222310cf437142c8a95846eadace40e5d612b10dd7a8fe4de`. The same already-invalid Idle0 Sabana/day pose was retained; this diagnostic is not new acceptance data.

Twelve synchronous readbacks of the same framebuffer differ by zero bytes. Thirty source redraws still alternate zero or 21 changed bytes, seven RGB pixels, maximum byte difference 59 and exact alpha. The source control maximum tile MAE remains 0.010757437286277613 and fails the unchanged control policy. Candidate comparisons remain absent.

Across 31 captured Mesh0 draws, all seven VBO/index readback hashes match. The 12×12 float bone texture is framebuffer-complete (36053), has 2304 bytes, no nonfinite values and the same GPU/CPU FNV fingerprint `e21e9964` in every frame. Captured program, render state, uniforms, texture/sampler metadata, attributes, matrices and bone-texture state also match. Console warning/error lists are empty for this variant; this does not erase the earlier noShadows warning.

These readbacks strengthen the instrument control and narrow the unobserved inputs. They do not read GPU texels of normal/material/environment/depth maps, inspect per-fragment arithmetic, identify a cause or waive the source gate. FNV equality is not collision-free. Diagnostic GPU queries and float-texture readback can perturb ordering/timing, so this is not a performance measurement. Original rendering and models remain unchanged.

The URL retains the four-campaign inventory-required condition. Root had confirmed six CPU workloads for the preceding crop capture; this report does not independently inventory every process throughout the worker run or establish an idle machine. No attribution to CPU load follows from persistence of the variation.
