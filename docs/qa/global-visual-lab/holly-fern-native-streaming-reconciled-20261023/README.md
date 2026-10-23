# Native fern streaming: reconciled activation

Seed712,1280x720,medium,native fern recipe/full backgrounds, paused simulation and fixed wind. Camera+target jump +192m/home/-192m/home in day and night, settling each stop. Not a continuous-motion video or FPS benchmark.

Found and fixed an activation race: three chunks arrived while fern maps loaded asynchronously, after coverage's initial snapshot but before the world adopted the new layer. Initial coverage owned22 of25 world chunks. After fern setup, reconcile the live chunk set, remove stale owners and re-read current chunk geometry/masks (including same-key replacements). One-time loading work, no extra per-frame scan. Regression test inserts a chunk during mocked texture loading and verifies ownership before activation.

Corrected capture: all10stops own exactly the25 current world chunks, no GL/JS errors, actual2048 shadows. Every home restores2502ferns,83calls,392455triangles, same camera/target and elapsed2. Day returns match each other exactly; night returns and its baseline are pixel-identical.

Initial day origin[0,0] versus return[96,0] differs8190pixels, mean absolute channel0.008206/255,max147. Independent no-travel origin control produces exactly the streamed return image: difference is reproduced by rebasing alone. Sparse residual retained as limitation, not claimed universal artifact-free rebasing. Initial origin-control script failed before captures due a scope mistake, corrected before the successful evidence.

Final home resources147geometries/82textures repeat day/night; intermediate counts differ (first day return151/96, first night156/91). Initial corrected home238/118. Finite disposal/reload evidence, not proof of long-run leak absence or measured VRAM. Prior pre-fix streaming artifacts retained in holly-fern-native-streaming-20261023; origin-control in holly-fern-native-origin-control-20261023.

5 focused coverage/resource tests and build passed. No simulation/navigation changes; default coverage unchanged. Native motion, active events, context-loss restoration, combined cost and six-biome closure still pending.

Reproduce with Vite5190 and WG_CARD_TREATMENTS=cards, WG_REVIEW_OUT set to this directory:
node tools/experiments/probe-holly-fern-native-streaming-20261023.mjs
Control: node tools/experiments/probe-holly-fern-native-origin-control-20261023.mjs
