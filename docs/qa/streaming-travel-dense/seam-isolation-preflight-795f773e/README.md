# Seam preparation isolation: source-level candidate

This isolated branch starts at `795f773e83640d3f7541d8e3d826764c3d779750`. It does not carry the negative standby-pruning candidate or activate shared resident preparation. No native timing or performance acceptance yet; no runtime PR proposed.

The complete negative shared ABBA is preserved separately in commit `efe7b1bb`. Its largest synchronous draw events in every arm identify `far-ground-native-water-mask-v1:seam-v2` around 98 m. Such CPU wall times can include GPU backpressure and uploads, not just compilation.

The main far-ground mesh is already attached to candidate.impostors. Initial seam preparation completes before attaching its mesh there, and the region then prepares that whole candidate. Later seam replacements use a separate preparation call before adoption. With native water-mask ground this call uses world.scene, but did not honor the existing `farIsolatedPreparation` option. The candidate forwards **only that existing option** to `prepareNativeFarGpu`: no new flag, shader recipe, geometry, texture, readiness shortcut or timer. False retains the old behavior; true hides unrelated renderables only during the synchronous zero-viewport upload draw, while preserving live scene lighting/fog, shadow enablement and output recipe. The exact seam still uploads, draws and fences; the old seam remains until replacement adoption.

The four integration tests use real attachNativeFarGround → seam owner → prepareNativeFarGpu with a deterministic renderer/GL double. They cover true/false policy, initial/replacement draw contents, live scene identity, viewport/scissor/autoclear/shadow/visibility restoration, retained old mesh during delayed compile, closure during compile and draw failure with no adoption. Existing owner tests cover config changes, late worker completion, context loss/restoration and borrowed resources. Baseline fails the isolated draw test; candidate passes 23 directed tests. The double proves control flow and state restoration, not a browser's GL behavior, pixel equivalence or GPU performance.

```powershell
node --test tests/native-far-seam-isolation.test.js tests/native-far-ground-seam.test.js tests/native-far-ground.test.js tests/isolated-gpu-root.test.js
```

Raw before/after TAP outputs are gzip-preserved and hashed in preflight.json. No build, heavy replay or GPU workload was run.

Next native comparison should use the existing streaming-travel fixture unchanged, same farm/quality/viewport/path and `isolatePreparation` in both control and candidate. Only the module source differs between frozen servers. Keep sharedPreparation absent in both arms. Verify actual seam preparation root and submitted draws, unchanged camera/logical/chunk outputs and disposal first; then ABBA and the 90–120 m position bin. Do not attribute an improvement solely to fewer renderer calls. Preparation must retain all seam geometry and exact material recipe, readiness/fence/cancellation, previous seam continuity and framebuffer state. A new GPU reservation is required before execution.
