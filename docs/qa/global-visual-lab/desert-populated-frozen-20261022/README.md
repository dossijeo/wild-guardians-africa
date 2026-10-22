# Populated Desert: matched medium/low visual tradeoff

24 real captures (warmup/final × day/night × three views × two profiles), full far background and mountains enabled. Six final side-by-side pairs verified exact camera,target,time,origin,elapsed and worker positions. Paused before first gameplay tick; saved elapsed119.99999999999746 retained. No captured page/WebGL errors. Original paid crops/workers fixture, not an advanced settlement.

Normal day/night pairs inspected: medium preserves cast shadows grounding buildings; low omits these shadows and looks less grounded despite retaining dune material relief and readable crops. Keep medium as artistic reference and preserve approved Desert shadow richness. Low is an optional performance fallback with explicit loss, not a visually equivalent improvement. Other views packaged for review, not claimed exhaustively reviewed.

Related benchmark: ../desert-populated-frozen-cost-20261022/README.md (720 valid GPU samples; same-profile repeated workload exact). Low saves2.8–5.6ms GPU in this paused resident scene. Capture draw counts use normal renderer resets, whereas benchmark accumulates full-frame passes; do not compare the two counters directly. No active-play/streaming/frame-rate claim.

Reproduce capture-desert-populated-frozen-20261022.mjs and compare-desert-populated-frozen-20261022.py. Medium left, low right. No runtime or selected recipe changes. Biome completion still requires remaining global validation and final main comparison review.
