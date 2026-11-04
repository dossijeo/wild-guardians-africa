# Confirmed motion feed: horizon and ordering

The presentation Worker may observe a tracked actor's already-executed motion.
`confirmed-motion-feed.js` keeps publication order and now revokes an observed
trace when confirmed simulation time advances past its end without a new trace
for that actor. Pause, invalidation, unavailable physics and an active physical
pose also revoke it. An equal-time publication does not extend the horizon.
This is a consumer safety rule, not a future-motion certificate.
The feed also marks every historical observation
`safeForAutonomousPlayback: false`; `representable` describes only whether its
shape can be encoded, not whether replaying it is physically safe.

`node --test tests/confirmed-motion-feed.test.js
tests/confirmed-presentation-stream.test.js tests/confirmed-gpu-motion.test.js`
passed 14 tests with the repository's Node 20 runtime. The browser audit
`tools/experiments/audit_confirmed_motion_feed.mjs` uses two real mangrove
simulation Workers and compares their snapshots and events. In the captured
run (`confirmed-motion-feed-qa.json`), a real animal produced 383 segments;
the feed accepted 28 ordered observations and revoked two invalidated ones,
rejected a stale sequence and removed the route on pause. Peer observations
were recorded for comparison. This audit does not exercise GPU rendering.

The trace describes motion that has **already occurred**: its end is the
published simulation time and actor position. Replaying it after that
publication while peers and the world are shown at their current state can
introduce visual body crossings or show an actor behind its authoritative
position. There is no certified future horizon, synchronized peer presentation,
or immediate guarantee against structural changes while the simulation Worker
is busy. The GPU motion helper therefore remains unbound to real actors. A safe
integration needs an authoritative trajectory/horizon contract and ordered
revocation or a separately validated presentation timeline before enabling
autonomous replay. No extrapolation, collision authority or game mechanics are
changed by the feed expiry rule.

## Synchronized historical presentation: missing inputs

The existing capture does not provide a safely replayable world window:

- `captureMotionPeers` records X/Z segments, radii and endpoint statuses for
  workers and animals. It expressly does not certify collision-free playback;
  it does not contain each peer's full physical pose over the interval.
- The confirmed terrain channel applies data only after the corresponding
  state sequence, but holds at most one pending payload. The residency manager
  replaces a chunk and disposes its old geometry; a consumer cannot ask it to
  render an earlier revision after replacement.
- A confirmed state has current structures and events, but the renderer has no
  single historical clock or reversible presentation for structure changes,
  peer poses, terrain, effects and invalidations together. Rewinding only the
  selected animal would display incompatible world states.

The smallest usable contract needs the authority to identify a bounded,
ordered simulation-time interval; provide complete actor/peer and physical-pose
information or prohibit interpolation across missing data; bind it to available
terrain and structural revisions; and supply ordered changes, pauses and
invalidations. The presentation must keep every displayed layer on the same
time, have access to those revisions for the interval, and stop at its confirmed
end. If any dependency is absent, it must display the latest confirmed state
without historical playback. This is a requirement for implementation, not a
claim that the current Worker supplies or certifies it. No snapshot retention or
new playback consumer was added without those inputs.

## What the native route state already guarantees

`spatial-intent-state.cpp` stores active intent routes in session/slot/
generation handles and tracks a cursor. On topology revision it checks the
remaining polyline against the current native navigation profile, preserving a
still-clear route or invalidating it and retaining the target lease where the
game rules allow. `tests/spatial-native-animal-intent.test.js` exercises remote
walls, a wall crossing an active route, the retained target reservation and
replanning. These are useful *current spatial* checks. The source explicitly
states that the continuous mover still performs its local collision checks;
the route is not a time reservation or a guarantee about future moving bodies.

The `WILD_CENTRAL_MOBILITY` build option exposes an experimental ordered
single-segment batch in `spatial-dynamic-bodies.cpp`. It checks a short step
against terrain and the current body registry and updates that registry in
order. Its own contract says it is not the authoritative game state, a path
planner, traffic coordinator or production entry point. It emits no timed
future horizon or invalidation guarantee. Enabling it beside the existing
movement would duplicate state rather than transfer authority.

The minimum viable single-actor integration cannot safely treat either of
those current checks as a future certificate. One possible first vertical
slice is to let the existing authoritative simulation Worker execute a bounded
interval, publish the resulting actor and peer observations with a common
simulation-time range and all structural/physical dependencies, and render
that interval only while the whole presentation is held to the same confirmed
timeline. Terrain revisions needed by the interval must remain available and
ordered changes must be applied at their timestamps. Stop at the last confirmed
boundary whenever any dependency is absent. Alternatively, an authority-owned
future reservation would need to cover moving bodies, topology and interruption
ordering without changing gameplay; neither the native route nor current batch
provides that. Neither approach is integrated or certified here.

Relevant existing regression entry points include
`tests/spatial-native-animal-intent.test.js`,
`tests/spatial-native-intent-bridge.test.js`,
`tests/browser/worker-path-motion-trace.html?peers`,
`tests/confirmed-presentation-stream.test.js` and
`tests/confirmed-gpu-motion.test.js`. They cover parts of native route
invalidation, observation, publication and GPU helper behavior; none proves a
complete collision-safe autonomous presentation.

## Binding shared materials and baked skinning

The confirmed WebGPU animal roster still applies each received state directly:
`webgpu-confirmed-animal.js` sets the root position from the latest actor and
either samples the mixer or sets the phase of the experimental baked hyena.
The world stream immediately reconciles the latest snapshot, while other
presentation components use `state.elapsed` or a real-time clock. A historical
trace is therefore not a safe time base for just one actor in this scene.
Neither the native route validity nor the peer samples establish the missing
world-wide safe interval.

The existing GPU helper cannot be attached unchanged to the shared animal
materials. `createConfirmedGpuMotion` owns a texture and uniforms per actor;
its `bind` rejects a material with an existing `positionNode` and assigns a
new one. The baked walking path already supplies a `positionNode` for skinning,
and `webgpu-animal-bank.js` shares its source materials between actors of a
species. Installing an actor-specific node on those materials would either
move every actor using that material or require private materials and their
associated resource and pipeline validation.

Three.js r180's `reference` node resolves an unspecified object from
`state.object` and updates at `NodeUpdateType.OBJECT`. This provides a possible
way to give each drawn mesh a stable index into a shared, persistent trajectory
and animation buffer while retaining one material graph. A composed position
node would apply the authoritative translation to the **result** of the baked
skinning node, while preserving its normal and shadow deformation. This is an
implementation option, not evidence that the current pipelines, bindings,
mesh transforms or performance meet that contract; it needs WebGPU draw tests
with multiple actors, shared materials, shadows, animation, cleanup and buffer
updates before use.

The first gameplay integration still requires one bounded presentation window
for the **whole** visible world: an initial confirmed state, complete timed
body and physical-pose information or an explicit stop when it is missing,
ordered events, and the terrain/structural revisions valid throughout the
interval. The display clock, animations, effects and geometry must all follow
that same interval and stop at its confirmed end. Retain a latest-confirmed
fallback when any dependency is unavailable. No trajectory has been bound to a
live actor by this review, and no new future-safety guarantee is implied.

## Receive/commit boundary

The confirmed-state receiver now exposes a `prepare`/`commit` boundary: it
validates and decodes one publication without mutating the displayed state or
notifying observers, then reconciles the same displayed object and emits its
events on commit. The WebGPU presentation stream uses both steps immediately,
in its existing order; it does not buffer or delay presentation. The caller
must own the publication and leave it unchanged until commit or discard. A
future asynchronous scheduler must enforce that ownership or copy the mutable
parts it retains. One pending token is allowed, and observer failure faults the
receiver. This boundary does not supply a presentation clock, terrain history,
physics timeline, complete trajectories or a safe interval.

## Bounded QA presentation hold

In a development game started with `qa-webgpu-hold-presentation`,
`wildGuardiansWebGpuPresentationControlQa('hold')` asks the real WebGPU
Worker to retain the next validated publication. Its state and physical poses,
events and terrain are not exposed until `wildGuardiansWebGpuPresentationControlQa('release')`.
The Worker continues drawing with the prior **confirmed state**; diagnostics
report the received sequence/time separately from the presented sequence/time.
This does not freeze every visual layer: `surface.render()` still runs
`roster.tick(performance.now())`, and the guardian's provisional gesture uses
its real-time clock. Reconciliation and texture transitions can also advance
on real time. The hold therefore does not establish a single visual clock or
claim a frozen image. It does not advance confirmed simulation time or provide
an interpolated trajectory. Disposing the stream drops the held publication
without acknowledging it; an unexpected second publication fails closed.

The held message is the Worker's exclusive transferred object and is bounded to
one. Its ACK is intentionally delayed until the publication and terrain have
been applied in order. Consequently the host may queue or throttle subsequent
publications: this is not the target's full simulation/render decoupling. The
normal path remains immediate; the hold is a DEV-only diagnostic and has not
yet been validated in a real WebGPU session or benchmarked. It does not certify
animation, VFX, physical poses, terrain history or a safe movement horizon.

## Confirmed clock for baked hyena walking

The existing `qa-webgpu-baked-hyena` presentation now supplies its baked
walking meshes with one shared GPU uniform for the **committed** presentation
time. Each animal's phase offset is set from its current confirmed pose; a
paused or held publication does not advance the uniform. The old per-actor
phase uniform remains selectable with `qa-webgpu-baked-clock-legacy`, and
physical poses, unsupported clips and transitions retain their existing paths.
To avoid visible phase discontinuities due to float precision, the GPU falls
back to that direct phase when reconstructing it from the shared clock would
differ by more than 0.1 ms or cross the clip boundary.

This is wired to the real QA animal roster, not a replacement for the world
timeline. It changes time only on confirmed publication, still updates each
actor's phase offset during roster reconciliation, and does not make movement
or animation advance independently between those publications. Other rigs and
visual effects are not yet governed by this clock. Node tests cover two real
hyena rigs, phases and fallback, and holding/committing a publication. They do
not prove WGSL rendering, visual parity, shadow behavior or a performance
gain; those need a bounded real WebGPU session.
