# Mangrove spatial coverage candidate: camera motion

240 requested frame-index camera poses per phase, day/night; full far backgrounds, selected spatial-size/moderate-jitter candidate. Horizontal radius28 to10 to28 at fixed camera height. Paused simulation, fixed vegetation/material clock: tests camera-driven visibility/LOD, not wind animation or active campaign. MediaRecorder wall-clock timestamps are not FPS evidence.

No recorded page/GL errors or coverage overflow;28 frames in each phase report pending far preparation. Five checkpoints per phase inspected: no major coverage cuts visible in those samples, broad homogeneous cover persists. This is not full-frame temporal certification. Contact sheets have one intentionally empty black sixth tile. Day WebM contains235 encoded frames from240 requested,1280x720. No performance inference from recording duration.

Reproduce: node tools/experiments/capture-mangrove-spatial-jitter-motion-20261022.mjs with Vite5190. CPU/GPU comparison runs separately in mangrove-spatial-jitter-cost-20261022, avoiding recorder contamination. Candidate remains QA pending evaluation.
