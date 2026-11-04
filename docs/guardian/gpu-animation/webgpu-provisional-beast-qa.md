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

An additional direct WebGPU visual control (`tests/browser/webgpu-provisional-beast.html`)
renders the real hyena on level terrain using the same actor and baked-fall
implementation. Captures are in `webgpu-provisional-review/`. The intermediate
pose originally had conspicuously extended arms. An experimental smooth blend
from the initial arm pose now reduces this at 0.5 seconds; see
`fall-050.png` and `fall-050-adjusted.png`. Captures `rapier-reference-step-4.png`
and `rapier-reference-step-8.png` show real Rapier poses from the mangrove
fixture, reproduced with `tools/experiments/capture_webgpu_provisional_rapier.mjs`.
The Rapier actor's heading and trajectory differ from the isolated fall, so
these images are not a controlled visual-parity or seamless-transition test.
The fall remains opt-in pending that review. The original Worker capture initially aimed
below the ground: the actor root was at y=3.32 while the camera aimed at y=1.
Correcting camera height showed terrain but still did not produce a useful
close-up of the animal. The isolated control does not validate the visual
transition into an actual Rapier pose.

## Matched attack comparison

On 2026-11-04, `tools/experiments/audit_webgpu_fall_reconciliation.mjs`
replayed the same hyena fixture with the original heading, attack origin,
contact point and ground height. At 0.5 seconds after the attack, the QA
fall and actual Worker Rapier pose are shown in `matched-provisional-050.png`
and `matched-rapier-050.png`. Both use the same camera and spatial anchor; the
Rapier sample includes its actual resulting movement. The provisional hyena
is still nearly standing while the physical hyena is seated. 36,241 of 480,000
pixels differ by more than 3/255 and the whole-image mean absolute channel
difference is 7.17/255. These are diagnostic image differences, not a visual
acceptance threshold.

Changing clip direction or advancing the clip more quickly did not reproduce
the Rapier pose for this case, and can change contact and flight in other
cases. No such adjustment was accepted. The fall remains QA-only; the test
does not demonstrate a seamless visual transition or collision-safe blending.

## Experimental pose reconciliation

The same QA switch now permits a 150 ms visual blend of model and local bone
poses from the provisional fall to the latest confirmed Rapier pose. Root
position and orientation are applied immediately from Rapier; a temporary
model-space visual offset preserves the previous visible world pose and decays
to zero. Simulation, collisions and damage are unchanged. The roster continues
ticking only actors that are actively blending. At the end of the interval the
displayed bone pose is the confirmed pose. The default path does not enable
this blend.

`tools/experiments/audit_webgpu_fall_blend.mjs` captures the matched hyena at
the start, middle and end of this interpolation in `reconcile-000.png`,
`reconcile-075.png` and `reconcile-150.png`. In this controlled view the final
image matched the captured Rapier reference before the later terrain-support
experiment, and the intermediate pose avoids an instantaneous full-rig snap.
After adding the visual offset, the first
reconciled image matched the preceding provisional image exactly in this
capture. The capture holds one Rapier pose fixed during the 150 ms.

The temporary offset and interpolated limbs can intersect terrain, obstacles
or other bodies. A full-vertex diagnostic against the *flat* floor of this
isolated control measured minimum heights +0.088, −0.297 and −0.611 at the
start, midpoint and end. Even the unmodified final Rapier pose intersects that
flat floor after normalization; the actual fixture terrain is not flat, so
these measurements do not establish penetration depth in the game. They do
show why the blend cannot be treated as contact-safe. Dynamic Rapier targets,
slopes, body contacts and obstacles remain unverified. This remains a QA
experiment and is not evidence for enabling the blend in production.

## QA terrain-support experiment

The QA path now samples every eighth vertex of visible skinned meshes and
raycasts against resident terrain, with a 3 cm margin. It lifts only the rendered
model enough to clear sampled terrain; the Rapier root, colliders, game state and confirmed
poses are unchanged. This visual correction can remain after the 150 ms blend
while a physical pose is active, so its final mesh is intentionally elevated
relative to the uncorrected Rapier rendering. No correction is possible where
the relevant terrain chunk is missing. The sampling and raycast cost has not
been established for crowds.

`tools/experiments/audit_webgpu_fall_real_terrain.mjs` checks every one of
22,242 skin vertices at the start, midpoint and end of the matched case
against `nav.actorSurface` from the real mangrove Wild Engine fixture. In this
locally almost-flat case, minima after the correction were +0.0878, −0.0011 and
−0.0087 m, with zero vertices more than 3 cm below that surface at each point.
The visual control renders a flat support plane; terrain validation queries the
actual Wild Engine surface. The three new images are `reconcile-ground-000`,
`reconcile-ground-075` and `reconcile-ground-150` in the review directory.

## Additional species, slope and wall checks

`audit_webgpu_fall_species_terrain.mjs` captures actual mangrove Rapier poses for
hyaena, warthog and buffalo. On the locally flat fixture surface, the warthog
check covered 20,421 vertices and the buffalo check 51,598. No vertices in the
three measured phases were more than 3 cm below the surface. An earlier 1/16
sampling with a 1 cm margin missed two warthog vertices at −3.9 cm; that result
motivated the QA-only 1/8 sampling and 3 cm margin. These are three phases of
one attack per species, not exhaustive contact tests.

`audit_webgpu_fall_slope_transfer.mjs` transfers those *captured* Rapier poses
to a mesh sampled from the real savanna Wild Engine surface at (108, −28),
where the local height changes by approximately 0.68 m per horizontal metre.
It does not run Rapier on that slope. Full-vertex checks at three phases found
no penetration greater than 3 cm for hyena (22,242 vertices), warthog (20,421)
or buffalo (51,598). Minima in metres were respectively +0.104/+0.030/+0.030,
+0.030/+0.030/+0.017 and +0.026/+0.030/+0.030. Results are recorded in
`webgpu-fall-slope-{hyena,warthog,buffalo}-qa.txt`.

This implementation is far too costly for production: on the 7,200-triangle
slope mesh, one isolated hyena `actor.update()` took approximately **3,341 ms**
because it raycasts for each sampled vertex. This single diagnostic is not a
global benchmark, but it rules out enabling the current approach in play. The
ordinary path does not execute this QA-only correction.

`audit_webgpu_fall_wall_guard.mjs` identified real mangrove wall `structure-684`:
the animal-radius endpoints on either side are walkable, while Wild Engine
rejects the connecting segment. The current visual blend does not request such
a certificate, so it can cross an obstacle and is **not obstacle-safe**. The
fixture's original hyena start/end are both non-walkable, which also prevents
interpreting that particular segment test as a clean obstacle check. Body
contacts, unloaded terrain and continuous visual motion remain unverified.
The terrain correction and interpolation remain QA-only.
