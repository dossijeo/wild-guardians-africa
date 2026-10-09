# Root review: exact wall buffer package

Reviewed frozen candidate `8faa9f19daa49d659e909e5687426885d70ee4a2`
on 10 October 2026. This is an isolated, OFF-by-default loading experiment,
not production promotion or native performance acceptance.

Root read the source diff against `116370c9`, generator, reader, actual
`Assets.walls` integration, proposal, verifier and directed tests. Independent
replay in the clean frozen worktree passed the preservation verifier and all
47 tests (1392.639 ms; CPU receipt, not a benchmark).

The tests compare all 160 original binary payloads and actual results from
both loader paths: 20 prototypes, typed geometry and morph lanes, morph peers,
bounds, material side and shadow settings. They verify one shared package
buffer, 160-to-one binary requests, deterministic generation, default-OFF
gating, cancellation, owner closure and late texture/body delivery. Textures
remain separate. The underlying package payload is unchanged, with 56 bytes
of alignment padding: 5,135,464 bytes total. No geometry repair, simplification,
construction rule, damage or morph behavior changes are involved.

The original Windows run `38005088945` failed before compilation started;
the two-batch compiler hypothesis was not exercised. Its pending asset state
motivates measuring this narrower request-count hypothesis, but does not
prove that wall requests caused the entire delay or that packaging will fix it.

Original buffers also serve the wall library and remain present. The candidate
therefore adds approximately 5.177 MB to the web package; it is not yet a
production size improvement. Do not remove originals without independently
preserving library compatibility.

Next authorized step: wire an explicit false-by-default smoke/CLI/workflow
option and diagnostics, then freeze for root review before dispatch. The
isolated measurement must keep compiler-window and resource-overlap options
OFF and preserve the original 90-second readiness gate, complete wall stage,
shader variants and GPU fences. No native run, PR, merge or performance claim
is approved by these CPU results.
