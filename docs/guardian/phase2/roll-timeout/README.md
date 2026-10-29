# Reproducible night roll timeout

Captured in the actual WorldScene night recorder with `?captureRoll=1`. First sequence completed; the second reproduced a timeout on the final repeated-hit hyena. The QA hook snapshots Rapier immediately after rollTo and records solver outcomes. It is opt-in, limited to eight snapshots and never imported by production. Snapshot allocation invalidates performance comparisons. Recording includes the controlled fixture camera changes and cooldown resets.

`capture.json.gz` retains three completed, single-actor captures (interrupted/removed actors omitted). Replay with:

    node tools/experiments/replay-captured-roll.mjs docs/guardian/phase2/roll-timeout/capture.json.gz test-results/replay.json

Baseline exactly reproduces the browser's three final angular errors, speeds and times. The failing final capture has error 2.8501062115837668 rad, speed 6.236870429238297 rad/s and timeout at 3.516666666666659 s. Two successful controls complete at 1.7 and 1.15 s. This is a deterministic physics reproduction, not graphical acceptance. Replays explicitly skip unfinished or multi-actor cases requiring external lifecycle inputs.

Diagnostic fourth argument: `no-support`, `passive`, `iterations32`, or `substep120`. These operate on an in-memory solver copy or restored world only; production constants are unchanged. Reports for these variants retain the original unfiltered capture indices (failing index 4, now index 2 in the filtered archive).

Removing support/integral torque fails both controls and does not cure the unstable case. Disabling the roll controller entirely still leaves the failing root moving at 10.855, 13.828, 20.329, 9.820 and 7.789 rad/s at steps 6, 126, 246, 366, 486. Thus instability exists in the captured physical state without roll actuation; passive result fields for roll completion are deliberately inactive and must not be counted as passes. The two passive controls settle. Raising iterations to 32 or reducing timestep to 1/120 also fails to complete the problematic roll. None of these alternatives is accepted as a fix.

Next isolate constraints/terrain contacts in the failing snapshot and capture the earlier impact state if necessary. Do not relax the supine completion requirement or mask the failure with a longer timeout.

Inspected `contact.jpg` (1 fps) from `night-capture.webm`: the final hyena remains low/sideways before eventual fallback recovery. Fine contact/anatomy cannot be certified at this sampling. The authored recovery requirement remains unsatisfied for this case.


## Terrain contact correction

Isolated the failing captured state: disabling joint motors or loosening limits does not resolve it; disabling terrain contacts does, whereas disabling solid boxes leaves the original result exactly unchanged. Enabling Rapier FIX_INTERNAL_EDGES resolves all three snapshots. Resetting each terrain shape with identical geometry and default flags still times out (error 1.68315 rad, speed 14.7592), so merely invalidating the shape/contact cache does not explain the successful result. Numeric variants are contact-isolation.json. These runs predate the progress grace below.

Production terrain creation now enables FIX_INTERNAL_EDGES, preserving terrain geometry, colliders and collisions. No physics dependency, per-frame geometry construction or increased iteration count. The change initially exposed a buffalo recovery deadline regression: it was still tipping over its support edge at 3.5 s (error .8170 rad), then reached the existing orientation/velocity criteria at 4.1333 s in a diagnostic longer run. Added a strictly bounded progress grace of 1.5 s, available only while error improves by at least .1 rad within .5 s. Completion thresholds remain unchanged. Failed/stalled rolls retain the fallback, and the captured uncorrected instability still times out in the new regression test; extending the deadline alone is not the hyena fix.

Validation: 41 combined physics/manager/captured-terrain tests passed, then all four captured-terrain tests passed after adding the negative control that retains the old terrain and asserts timeout. Existing shipped-GLB tests cover all five species and require authored recovery (including buffalo). No full graphical acceptance of buffalo is claimed by these tests.

Actual corrected WorldScene night recording: fixed-night.webm (9,675,660 browser bytes), fixed-night-status.json, fixed-contact.jpg at 2 fps. One Guardian maximum; errors empty; zero active bodies/worlds at end; zero rollFailures; final hyena roll finishes at 1.05 s, error .377708 rad, speed .342387 rad/s. Inspected the contact sheet: final hyena reaches supine, rises and subsequently moves away. Terrain clearance of every vertex and full-speed motion quality remain outside this sparse visual check. Capture hooks were active, so performance numbers are not benchmark evidence. The scene uses deliberate camera changes and QA cooldown resets, as before.

Production build also passes; existing dynamic/static import and large-chunk warnings remain.
