# Reproducible night roll timeout

Captured in the actual WorldScene night recorder with `?captureRoll=1`. First sequence completed; the second reproduced a timeout on the final repeated-hit hyena. The QA hook snapshots Rapier immediately after rollTo and records solver outcomes. It is opt-in, limited to eight snapshots and never imported by production. Snapshot allocation invalidates performance comparisons. Recording includes the controlled fixture camera changes and cooldown resets.

`capture.json.gz` retains three completed, single-actor captures (interrupted/removed actors omitted). Replay with:

    node tools/experiments/replay-captured-roll.mjs docs/guardian/phase2/roll-timeout/capture.json.gz test-results/replay.json

Baseline exactly reproduces the browser's three final angular errors, speeds and times. The failing final capture has error 2.8501062115837668 rad, speed 6.236870429238297 rad/s and timeout at 3.516666666666659 s. Two successful controls complete at 1.7 and 1.15 s. This is a deterministic physics reproduction, not graphical acceptance. Replays explicitly skip unfinished or multi-actor cases requiring external lifecycle inputs.

Diagnostic fourth argument: `no-support`, `passive`, `iterations32`, or `substep120`. These operate on an in-memory solver copy or restored world only; production constants are unchanged. Reports for these variants retain the original unfiltered capture indices (failing index 4, now index 2 in the filtered archive).

Removing support/integral torque fails both controls and does not cure the unstable case. Disabling the roll controller entirely still leaves the failing root moving at 10.855, 13.828, 20.329, 9.820 and 7.789 rad/s at steps 6, 126, 246, 366, 486. Thus instability exists in the captured physical state without roll actuation; passive result fields for roll completion are deliberately inactive and must not be counted as passes. The two passive controls settle. Raising iterations to 32 or reducing timestep to 1/120 also fails to complete the problematic roll. None of these alternatives is accepted as a fix.

Next isolate constraints/terrain contacts in the failing snapshot and capture the earlier impact state if necessary. Do not relax the supine completion requirement or mask the failure with a longer timeout.

Inspected `contact.jpg` (1 fps) from `night-capture.webm`: the final hyena remains low/sideways before eventual fallback recovery. Fine contact/anatomy cannot be certified at this sampling. The authored recovery requirement remains unsatisfied for this case.
