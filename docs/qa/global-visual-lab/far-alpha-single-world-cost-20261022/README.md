# Moving-camera alpha benchmark — workload gate failed

Single-world ABAB still changes selected geometry during the moving path. GPU and cadence passes differ at multiple frames (including 4988 extra triangles in many daytime GPU frames and occasional 13800/23085 triangle differences). Consequently do not infer shader speedup or regression from these measurements. Keep raw data for selection/preparation debugging. The fixed-camera follow-up isolates blend cost only and cannot replace the required camera-movement validation.
