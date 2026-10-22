# Mangrove leaf-cover isolation

Diagnostic only: hide continuous coverage group; preserve selected terrain, moss, water, objects, camera, full backgrounds and lighting. Twelve real frames, day/night and three poses, no recorded errors; coverage audit confirms inactive throughout. Not an artistic proposal or optimization benchmark. Normal day image inspected: the prominent dark leaf patches disappear; underlying moss remains broadly continuous with its own repetition. This isolates the leaf layer as contributor, not the precise distribution cause. Source has a hard slope exclusion at0.42; a separate QA slope-size fade will test that hypothesis. Production unchanged.

Reproduce: node tools/experiments/capture-mangrove-cover-isolation-20261022.mjs (Vite5190).
