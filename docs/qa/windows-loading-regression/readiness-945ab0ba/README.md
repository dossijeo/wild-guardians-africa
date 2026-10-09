# Original Windows readiness observation

Run [37988150847](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37988150847), source `945ab0baa3095943c9aa08a5f28c9b70b5872499`, ended with failure. The original 90-second readiness requirement and native product launch were unchanged. This observation branch is not a production fix or merged runtime.

The original artifact `11644271964` is preserved byte-exact in `desktop-smoke.json`: 8,683 bytes, SHA256 `cff8c536e6c75537c13173fe000c6b129de8801b79d5b3d277fbd9e3c2d26d51`. Root downloaded and parsed it independently. Its sole error is `Production world did not finish loading`; measured world wait is 90,040.6 ms, visible/focused, stage busy and readiness false.

At report completion the existing World renderer identifies `ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)`, without context loss. This is actual context identity, not proof that the driver caused the failure.

The bounded readiness snapshot records:

- 242 observed asset transfers, zero pending and zero failed; 125,863,653 loaded bytes. This does not prove readiness of every future gameplay asset.
- Native chunk stream: 25 desired, zero queued, not busy and zero failed. Queue state is not GPU completion.
- Configuration through chunks completed; GPU, far-assets and visible-ready milestones remain unfinished.
- Active awaited spans: `app-world-load` 62,761.3 ms, `load-warm-gpu` 29,514.3 ms and `warm-compile-world` 22,185.5 ms. They are nested wall durations and must not be added or interpreted as GPU timer measurements.
- Last completed synchronous submission: `loading-compile-submit`, 2.9 ms. The report does not identify the individual pending batch, material or program, nor separate shader-driver wait from cooperative scheduling.
- Diorama remains interactive; orbit settled, four plants at approximately 83.28% growth. Cinematic has not started.

The next investigation is the actual world shader preparation pipeline. No download-time, terrain-generation, individual-material or deadlock cause is established. No timeout extension, loading bypass, quality reduction, production promotion or performance acceptance follows from this report.
