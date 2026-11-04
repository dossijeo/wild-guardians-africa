# Experimental WebGPU picking

`qa-webgpu-picking` enables an asynchronous, on-demand Worker endpoint for confirmed animals, crop bounds and resident terrain. `wildGuardiansWebGpuPickQa(clientX,clientY)` converts client coordinates and returns the hit and confirmed state sequence; request IDs correlate out-of-order responses. `tools/experiments/audit_webgpu_confirmed_picking.mjs` exercised the endpoint in a real WebGPU raid with 16 animals. Unit tests cover animal, crop, terrain and response ordering.

This is not connected to game clicks. Resident terrain, building and vegetation geometry now occludes targets. The client sends the latest camera and rejects responses after a newer request, camera change or below the requested minimum state sequence. Actual visible target picking still needs real-world validation; alpha-cutout leaves and GPU-deformed geometry are not represented exactly by CPU raycasts. The result is not a performance measurement.
