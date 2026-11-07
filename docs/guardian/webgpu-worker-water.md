# Confirmed Wild Engine water in the WebGPU worker

The optional confirmed terrain channel now transfers the native water triangles in the same revision as their ground. The WebGPU residency creates and disposes the corresponding mesh with its ground chunk. No simulation geometry is transferred away from the authority: the publisher copies all native buffers before transfer. Stale revisions are rejected together. Terrain without water stays supported.

`tools/experiments/audit_webgpu_confirmed_terrain.mjs` tests a real hosted simulation and the mangrove island network using strict WebGPU. The recorded run in `webgpu-worker-water.json` received both selected terrain and water chunks, drew four meshes, and did not use the main thread to forward confirmations. The delayed-chunk audit also confirms that the new water remains hidden until the matching state sequence is confirmed. Unit tests cover copied buffers, revision handling, replacement and disposal.

The water uses a solid placeholder material; the original water shader, dynamic effects, shoreline, interaction, and artistic parity remain to be migrated. This is not connected to the main gameplay scene. The current simulation authority has no graphical chunk eviction command, so this change does not claim bounded world streaming or invent a new simulation retention policy. No performance comparison is claimed.
