# Automatic gates in mixed canyon boundaries

The existing production boundary graph now includes hostile river contours alongside cliff contours and solid footprints. The new native regression explicitly exercises a mixed enclosure: two paid wall sides, a river bank and a cliff. The first stroke remains open without a gate. Closing it using a different wall material creates exactly one automatic gate on the new stroke while preserving older paid pieces and worker access.

Removing and rebuilding another wall piece using adobe preserves the original stone gate exactly and creates no second gate. After serialization/reload, deleting the gate and rebuilding its gap using a palisade creates exactly one gate on the newly added piece, preserving every older remaining piece. No gate is placed into the river or cliff.

The focused canyon, boundary, gate passage and gate articulation suite passes 52/52 in 10.85 seconds. This adds regression evidence for the existing rule; it does not alter raid parameters or modify runtime source while native campaigns are executing. Synthetic river/cliff fixtures test controlled closure geometry; the suite also retains native canyon cliff, real movement and mixed-wave tests. No visual QA is claimed.
