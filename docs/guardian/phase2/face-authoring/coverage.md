# Active facial coverage

Run `node tools/guardian/audit_face_coverage.mjs docs/guardian/phase2/face-authoring/coverage.json --require-all` from the repository root. The strict check intentionally exits nonzero while any active animal/worker lacks a required POSITION morph channel. It resolves the runtime catalog, fingerprints the exact GLBs and records candidate files separately, including whether their bytes match the active model.

Current result: warthog, hyena and lion have blinkL, blinkR and mouthOpen. Buffalo, rhino and all four worker profiles still lack these channels in their active assets. Lion installation and runtime evidence are recorded in docs/guardian/lion-installed. The six ActorExpression tests pass, proving controller behavior on test geometry; they do not prove the absent facial geometry works in game.

This check proves channel availability only, not correct topology, nonzero motion, anatomical alignment or visual quality. Each remaining model needs individual eye/mouth landmark authoring, preservation of teeth/commissures, actual oral interior, texture cleanup, weight isolation and visual approval before catalog replacement. Do not reuse the rejected generic chin cut. Existing hyena/lion sources and inspection scripts remain the starting points; no models were replaced during this coverage audit.
