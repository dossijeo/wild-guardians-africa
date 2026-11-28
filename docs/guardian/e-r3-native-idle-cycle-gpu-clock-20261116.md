# Native Idle cycle: phase graph and direct draw clock

Continuation of `e-r3-native-idle-cycle-admission-20261116.md`. The finite
family21 program now has a stationary GPU phase graph, terrain certification,
typed clock transport, prepared admission in the existing draw Host and exact
submitted-time picking. This is a partial consumer integration. The original
roster/Surface lifecycle, production capability, Game projection/persistence and
hardware drawing remain pending. No A6/A/B/C closure changes.

The graph uses the existing stationary transform on the actual body point and
the original Idle/Alert clips together. Its uniform selector evaluates the
issued rest/watch knot, preserving the source's one-nanosecond deadline rule.
A standard lower-bound search in the ordered nonnegative float32 domain encodes
the native absolute-time comparison as its first matching submitted float. The
Host derives this constant once from the actual association's execution origin,
including a translated origin, and writes it through the existing clock-binding
adapter. It is a program constant, excluded from the submitted pick-time list;
there is no policy decision or binary search during replay. This avoids changing
the categorical boundary when a large absolute origin rounds an addition. Real
native tests cover origins of 10^6, 10^9 and 10^12 seconds.
The phase is bounded by the finite program; the clock
cannot run it into another stochastic decision. Initial authored phase is reduced
modulo its clip duration in double precision before float conversion. The CPU
pick sampler follows the same float arithmetic, including the split watch offset.
No JS timer, navigation, private RNG update or additional owner is introduced.

Revalidating the same program changes its typed clock metadata, preserving its
TSL nodes, phase nodes, material transform and cache keys. It does not turn a new
cycle into a retiming of an old permission. A subsequent actual cycle still needs
its own native association and prepared release. The terrain entry point uses
the existing certified foot-triangle kernel and invalidates a real geometry
change; it does not inspect or reconstruct an entire terrain graph.

The direct Host validates the exact family21 prepared template and matching
relative clock before acknowledging a drain. Native commit/release installs the
existing controller's cycle lease and captured body record. Replay uses its actual
execution epoch and dynamic phase end, including Task/Home interruption. It caps
only this binding, preserving independent clocks. Removal invalidates replay.
Picking reads the precise submitted float, its execution origin and world proof;
it rejects another role, epoch or a phase beyond the finite program. Historical
family21 bootstrap still rejects, and the draw worker does not yet advertise a
production family21 capability.

Before designing this mechanism, actual Three.js r180 source was inspected:

- [`AnimationMixer.clipAction`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js)
  reuses actions by clip/root/blend mode and reuses parsed bindings through a
  prototype. This supports keeping authored clips and actors resident instead of
  substituting new animation owners.
- [`AnimationAction._updateTime`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js)
  bounds finite playback and retains its terminal time. Wild Guardians adapts
  that finite-program pattern to its native causal clock, rather than creating
  another mixer clock.
- The installed `Pipelines.getForRender` implementation was read for its shader
  and pipeline caches and pending compilation reuse. Phase/program values remain
  uniform data, and native identity metadata stays outside TSL structural keys.
- Actual libc++
  [`lower_bound`, llvmorg-18.1.8](https://github.com/llvm/llvm-project/blob/llvmorg-18.1.8/libcxx/include/__algorithm/lower_bound.h)
  was inspected before implementing the origin-dependent encoding. Its iterative
  interval halving supplies the first matching item in an ordered domain. The
  installed Three `Interpolant` binary search was also read. This bounded
  admission-time calculation adapts that established algorithm; it does not add
  an animation controller, dependency or speculative tolerance.

Existing Wild Guardians stationary transforms, terrain certification, clock
retagging, controller21 leases and prepared Host admission were inspected and
extended. No dependency was added. The real Host's existing buffer versioning
also matters: prepared uploads copy a changed published uniform and rebuild its
immutable dependent binding so the previous packet can still draw safely.

The allocation check distinguishes protocol IDs from native objects. In the
low-level consumer test, entering a cycle and admitting a following REST each
retain the same protocol resources and the same unchanged 36-byte vertex buffer.
Preparation creates one replacement 16-byte uniform and one dependent binding;
the Host counters and physical fake-device buffer identities verify that delta.
Subsequent replay creates no further physical buffers. Zero new client resource
IDs would not, by itself, prove zero GPU allocations. This bounded test is not a
full-game or original-worker allocation measurement and does not settle healthy
incremental recovery of all 3123 resources.

Validation totals and evidence:
[`performance/native-idle-cycle-gpu-clock-validation-20261116.json`](performance/native-idle-cycle-gpu-clock-validation-20261116.json).
The phase tests use real WASM and the actual Three WGSL builder; no graphics
device executes those shaders. The consumer tests use real source, preparation
and control channels, retained commands, Host, controller and picking with a
simulated GPU queue/pipeline. They cover advancing preparation/drain, finite
endpoint versus an independent peer, genuine pending Task/Home, following REST,
typed rejection, cancellation and removal. The Home and following-REST fixtures
explicitly mirror native semantics; they do not supply the pending Game producer.

Next: connect the original resident roster, baked Idle/Alert variant and Surface
prepared lifecycle, then validate actual color/shadow/pick output and changed
versus retained GPU resource identities in hardware. Game phase projection and
semantic restoration, full stroll/approach/anchor policy, other sources/classes/
endings/gates, ordinary production, live birth/world replacement, full3123
incremental recovery and integrated A/B/C acceptance remain open.
