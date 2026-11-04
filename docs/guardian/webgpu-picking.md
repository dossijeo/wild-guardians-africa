# Experimental WebGPU picking

`qa-webgpu-picking` enables an asynchronous, on-demand Worker endpoint for confirmed animals, crop bounds and resident terrain. `wildGuardiansWebGpuPickQa(clientX,clientY)` converts client coordinates and returns the hit and confirmed state sequence; request IDs correlate out-of-order responses. `tools/experiments/audit_webgpu_confirmed_picking.mjs` exercised the endpoint in a real WebGPU raid with 16 animals. Unit tests cover animal, crop, terrain and response ordering.

This is not connected to game clicks. Buildings and vegetation do not yet occlude targets, actual visible target picking needs visual verification, and camera ordering and stale responses must be resolved before replacing the legacy picker. The result is not a performance measurement.
