# Native balanced Canyon shoreline option

Enable visualLab=global-lighting&waterEdges=natural&canyonBank=balanced in Grand Canyon. Independent of waterCore=opaque; review captures use the measured opaque-core combination. Other biomes/default unchanged. Original shader order retained; inconclusive early-discard optimization excluded. No simulation, geometry or logical boundary changes.

Twelve real captures, medium1280x720 seed712, full backgrounds. Five of six native comparison images RGB exact to QA; day view0 differs13 pixels in7x3 region beside building (same residual area seen previously), not in water. qa-comparison.json records bounds. No recorded errors. Five targeted tests pass for opt-in scope, texture ownership and core behavior.

Evidence: balanced-bank QA captures,192m original/balanced streaming controls, day/night240-request camera videos (235 encoded), static ABAB GPU benchmark. Day cost +1.08–1.86ms, night +0.18–0.31ms on measured Intel UHD scene. Retain visual improvement with cost disclosed. Sparse day/night filmstrip review shows no obvious bank cuts; not exhaustive temporal/device validation. Night filmstrip retained in canyon-balanced-bank-motion-20261022.

Reproduce: node tools/experiments/capture-canyon-balanced-native-20261022.mjs. The historical globalReviewedQuery remains unchanged so previous controls reproduce their original water bank; explicitly add canyonBank=balanced to review this option. Repetitive reflection appearance remains a separate next task.
