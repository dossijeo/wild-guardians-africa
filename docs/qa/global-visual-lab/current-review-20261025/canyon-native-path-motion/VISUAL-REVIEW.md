# Canyon current motion: visual validation rejected

Reviewed day and night contact sheets and full-resolution day-6.png on 2026-10-25. Branch codex/global-visual-lab; renderer reference b961a1e7d plus QA camera-path changes. No renderer change in this review.

The longitudinal native-camera route preserves warm stratified walls, contrasting river banks and readable buildings in the inspected checkpoints. However, day-6.png (30.012 s) contains a large rectangular sky opening in the right canyon wall. This blocks visual acceptance even though the path and execution audits pass.

At that checkpoint the desired graphical chunk 0,4 is absent, one chunk is preparing and the far adapter reports no pending work. At the near-equivalent night checkpoint all desired chunks are present and the opening is absent. See visual-failure-evidence.json. This supports a missing graphical-chunk/fallback hypothesis; it does not yet prove the renderer mechanism or the duration of the opening. The night scene continues the day simulation and is not a controlled lighting-only A/B.

Next action: inspect Canyon distant terrain clipping and retention while a desired near chunk is still preparing. Preserve procedural geometry and approved materials; do not mask the issue by slowing the QA camera or waiting before every frame. Validate any correction in real motion and with a controlled delayed chunk.

The raw top-level note still describes the earlier generic diagonal path because its correction was saved after the capture process started. records.motionPath=canyon-z and recorded coordinates are authoritative: 144 m Z outward/return, fixed X, eye terrain clearance at least 3 m. The capture script now writes the corrected note. No raw telemetry was edited.

These recordings include capture overhead and are not GPU or load-time benchmarks. Automated summaries establish path/execution checks only, not artistic approval. No all-biome completion is claimed.
