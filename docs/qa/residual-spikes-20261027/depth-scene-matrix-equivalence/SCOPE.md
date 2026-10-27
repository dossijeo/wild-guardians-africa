# Narrow matrix reuse candidate

QA-only installer: within WorldScene.drawWorldFrame, after a successful captureDepth, suppress only the immediate matching world scene/color automatic matrix traversal. Camera synchronization, depth draw, render-origin entry/restore, detached shadow root and auxiliary scenes remain unchanged. Any intervening auxiliary renderer call invalidates reuse. Restoration is exception safe.

Source audit: current scene hooks select/repack instanced data; building/VFX render callbacks update camera uniforms. Building opening preparation runs before the depth/color pair. This is not a general cache across arbitrary callbacks: a future transform mutation between the paired passes would require invalidation. Do not adopt without current real-frame visual/dynamic validation and ABAB benefit. No production activation. Two ownership/order/exception tests passed. Full-color day/night readback is running.
