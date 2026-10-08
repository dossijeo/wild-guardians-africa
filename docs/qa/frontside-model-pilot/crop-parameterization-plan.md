# Source-defined field domains: prepared audit

The global boundary draft has source vertex/corner correspondences but no shading-field lookup. `frontside_blender_parameter_audit.py` is prepared and syntax checked; it has **not executed** at this revision. Root is using the GPU for traveling QA, so no Blender or own scene was launched.

The audit reconstructs each original geometric chart and its separate vertex fans, then tests a positive-weight harmonic disk domain with an arc-length circular boundary. This is an auxiliary geometric coordinate system, not a replacement for original material UVs. Closed charts, multiple boundary loops, unsupported incidence, singular solves and Float32 folds receive explicit unsupported results. They require source fallback or justified seams; neither capping nor camera-based selection is allowed.

Every retained proxy endpoint obtains its domain value through its original face/corner correspondence. All coincident fan corners must agree exactly. The audit then tests positive parameter area of the actual coarse proxy triangles. Geometric QEM orientation alone does not guarantee parameter orientation. If the current proxy folds in this domain, a separate constrained-generation experiment will be required; this draft is not silently corrected after viewing quality results.

The domain solve and checks do not establish field interpolation accuracy, shader derivatives, growth/bridge behavior, self intersections or visual fidelity. No atlas texture, renderer modification, GLB or GPU memory claim exists. Completing a representation and passing original-versus-derived DoubleSide controls remains prior to FrontSide quality/benchmark experiments. The established visual, shadow, triangle/byte/memory and net GPU gates remain unchanged.

```powershell
& .cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe --background --python tools/frontside_blender_parameter_audit.py
```

Run only in a coordinated CPU interval, record the actual process/session and terminal result, and archive the resulting report and payload before further candidates.
