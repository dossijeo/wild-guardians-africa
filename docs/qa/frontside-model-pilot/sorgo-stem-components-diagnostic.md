# Stem connected components and selective reverse cost

Blender read-only audit uses original faceLabels=1 and exact numeric-position edge incidence for all five Sorgo native states. No geometry, normals, UVs or source files change. Original face IDs are recorded. Components are connected by source edges, not camera masks, quantized seams or boundary loops.

|State|Stem triangles|Face components|Triangles in components with actual whole-model boundary|
|---|---:|---:|---:|
|1|84|1|0|
|2|239|3|231|
|3|300|3|298|
|4|398|3|378|
|5|428|3|425|

Every audited stem face has positive area and every corner normal is finite/nonzero and not opposed to its geometric face normal. This is a local agreement test, not rigorous vertex-link/solid winding or visual approval. Each state includes source whole-model junction/winding-conflict edges, and every regional component has attachment boundary edges. No component meets the isolated closed-region witness. Regional cuts remain distinct from actual holes, and closedness is not a universal prerequisite for FrontSide.

Mature state's main424-triangle component contains10 actual whole boundaries and23 junction/conflict edges; a separate one-triangle component has2 actual boundaries, while a3-triangle component is a pure regional cut. Thus reversing entire components touched by actual boundaries would add425 faces, essentially every stem face. This criterion does not yield a small selective geometry repair. It is not justified to duplicate this near-entire region and claim rawFront savings. All-stem reversal would cost3.565–8.304% native-state triangles across stages, but retaining both orientations reproduces bilateral visibility and increases index/vertex/group work; net GPU benefit would still need measurement and is not predicted here. The two extra material groups would also need color/depth/shadow cost accounting.

Blindly recalculating or flipping these already aligned stem normals is not supported by this audit. A narrower reconstruction requires semantic identification of thin/open attachment surfaces with attribute ownership and growth/wind preservation. The mature native Front color rejection is not proven to originate at these boundaries. No view-selected reversal mask, cap or candidate is emitted by this diagnostic.

Reproduce with portable Blender: `--background --factory-startup --python tools/frontside_blender_stem_components.py`; observed completed execution~4.1s after loading's tab9/context disposal, without a GPU scene or timing campaign in this agent. JSON status explicitly rejects selection/approval interpretation. Full category, bridge continuum, resources and net GPU gates remain unsatisfied.
