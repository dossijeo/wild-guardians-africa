# Provisional beast impact in the WebGPU Worker

The Worker accepts the same validated `guardianBegin` and `guardianResolve`
messages as the guardian presentation. The actor renders a provisional recoil
without changing the simulation. Rejected commands remove it; a confirmed
Rapier pose supersedes it. Until that pose arrives, the Worker holds the
bounded provisional sample instead of briefly returning to walking. Entries
are limited to ten seconds if no response arrives.

The optional `qa-webgpu-baked-hyena` path also requests the existing baked fall
bank once in the background and plays a visual fall, keeping its horizontal hip
position fixed. If the bank is not available, it uses recoil. This fall is
experimental and **not enabled by default**: the offscreen test canvas was
blank in capture, so the fall, ground contact and visual reconciliation have
not passed visual review. The normal path does not request the fall bank.

`tools/experiments/audit_webgpu_provisional_beast.mjs` uses the same hosted
simulation and WebGPU Worker fixture as the hyena walking audit. Its fixture
initializes the hyena as walking. The audit checks a rejected provisional
command disappears and a second provisional fall transitions to an accepted
Attack, confirmed physics, and released walking. Its recorded result is
`webgpu-provisional-beast-qa.json`. It proves the inspected state transitions,
not full-game visual parity, immediate ragdoll in all hardware conditions, or
the absence of discontinuity when the provisional pose is replaced by Rapier.
Use the temporary QA server documented in `webgpu-hyena-walking-qa.md` if the
normal Vite server is unavailable.
