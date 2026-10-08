# Chunk adoption attribution

2026-10-08: source inspection finds worker generation already serialized off the
main thread, but `NativeChunkStream.receive()` synchronously calls WorldScene
installation. Installation constructs terrain/water and20 prop slots, then
adopts the complete group. This is a plausible source of individual CPU spikes,
not established as the main cause of unstable traveling.

The archived isolation-cheap AB/BA reports contain15 installs each. Maximum
install CPU times are6.4ms (A1),4.7ms (B1),5.6ms (B2),4.7ms (A2), versus frame
p95 values199.5,133.0,133.1,182.8ms respectively. These historic reports had four
CPU campaigns active and are not measurements of the current runtime.
Their narrow installation timings exclude future GPU uploads/driver work and
rendering after adoption. They do not justify assuming a chunk queue alone
would remove the much larger frame-time spikes.

The traveling fixture now offers opt-in `?chunkPhases` attribution. Each install
retains its aggregate timing and adds terrain time, per-slot instance count/time,
sum of prop slots, terrain remainder and adoption remainder. Slot times are
nested in terrain time; do not add them again. The ordinary fixture path retains
its existing installation measurements without these extra wrappers. There are
no GL queries in this new diagnostic and no production scheduling changes.

Syntax checked; native results for this new flag remain pending. Profiling adds
CPU overhead, so use it for attribution separately from uninstrumented AB/BA
acceptance runs. Scheduling changes should follow measured attribution and keep
deterministic placement, current suppressions, readiness and ownership intact.
