# Motion capture instrumentation control

The current Sabana run with getError on every frame suffered severe missing nearby ground. A diagnostic repeat recorded ready terrain units waiting over six seconds and only one installed chunk during 40 seconds. Keeping the same renderer, recipe and route but querying GL errors once at the end installed 39 chunks. Console errors remain monitored throughout; final GL error is zero. These are sequential single runs, not an interleaved performance acceptance test.

The sparse-GL farthest checkpoint shows nearby terrain restored. Blue areas still appear at distance; this does not close background coverage. Do not describe the full-query recording as representative uninstrumented gameplay, or infer that the scheduler itself is fixed. Continuous getError adds synchronization pressure, and the scheduler's CPU admission guards then inhibit needed streaming. This experiment changes QA only, not production scheduling, materials, geometry or density.

Both full-query and sparse-query original recordings are preserved. Snapshot telemetry is taken every five seconds. A null per-frame glError in sparse mode means unmeasured, not GL_NO_ERROR. End-of-phase finalGlError and console monitoring remain acceptance checks. Video encoding and screenshots still add overhead; no FPS benefit is claimed.

Next investigation: distant ground coverage with sparse GL monitoring, and a no-recording control if scheduler throughput remains suspect. The prior path audit does not test ground visibility.
