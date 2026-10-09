# Native labelled growth buffer baseline 892

Root executed one native bindings campaign on frozen c5f035eed835ea092e1a547e30e0faa0ff1ebed1. Viewer SHA a500a232b144b6c413fb3a3418439db925702d74752cb29b11d96ce64501c91d; probe SHA 778af46ffc9a644c19fd52d1a97ffb0eb3e351901f7df5086959b91232a0ac07. URL: `http://127.0.0.1:5284/tests/browser/frontside-maize-world-dense-gpu.html?campaign=bindings&qaDepth=front&vfx=on`. Context closed/lost, errors empty. This contains synchronous diagnostic readback, not GPU timings.

All 24 selected mesh color draws (12 original, 12 candidate) match the live CPU iGrowth bytes. They use MeshStandardMaterial, null render target and shadowMap enabled. This establishes the changing color upload in these recorded draws, not full growth appearance or category approval.

The 24 VFX depth draws use MeshDepthMaterial, target token1 and shadowMap disabled: 17 differ and seven match. Every difference is in active lanes; unused capacity has zero differences. The first draw's CPU vec3 is approximately (.999528, .998115, .984786), while the GPU has (1,1,1). Depth therefore has a real stale growth upload in this instrumented baseline. No shadows were observed through onBeforeShadow. A common buffer token1 persists in all records, with 32768-byte capacity and 20112 active bytes. Readback totals1.5MiB; this is not physical VRAM accounting.

Static frame-cache/order hypothesis remains separate from the directly observed pass attribution. No scene order, forced upload, extra warm draw or renderer frame counter was modified. Root owns any proposed production render-order fix and its separate regression. World timing remains pending depth correction/validation. Historical 891 is retained unchanged. Policy3 pixel differences remain diagnostic, not automatic rejection. Root's bounded console capture is retained, including texture serialization warnings.

Run the adjacent verify.mjs to check SHA receipts and pass counts. No production asset activation or PR approval.
