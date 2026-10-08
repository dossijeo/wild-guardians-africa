# Mature maize: visible WorldScene angle and real growth VFX

Root CUA Browser 2, tabs 876 and 877, one WebGL context at a time, on
`codex/frontside-model-repair` HEAD `213bced2`. Viewer SHA-256:
`f895d3d425ffce4425bd6e2b9291c21695a74925ca9fb29a5965b071e3cdb543`.
The paused archived Gran Rio / Suajili farm uses the actual WorldScene.
No user save is changed and no repaired asset is enabled in production.

Both fresh contexts used `qaCandidate=off&qaDepth=front`, then Load, Day 150,
Focus, Angle once, real growth magic on the QA copy, Compare, Finish. Tab 877
also selected the diagnostic closeup after Angle. Focus and spell share
`plant-355210`; angle is pi/2, distance 16 in 876 and 6 in 877. This angle
avoids the central building occlusion that limited the preceding 873/874
captures. Each PNG places the original on the left and candidate on the right.

Root inspected both full comparisons: the visible mature maize retains its
overall form, leaves and ears, without evident disappearing faces, deformation
or VFX artifacts in these views. This is a limited visual inspection, not user
approval or acceptance of all angles, growth transitions, crops or workers.
The native report's `HUMAN_REVIEW_PENDING` identity is preserved unchanged.

Each comparison records identical camera and target for its two arms, unchanged
logical state, one active agriculture effect, original DoubleSide depth and
three authored FrontSide candidate depth groups. Candidate color is FrontSide;
shadow materials deliberately remain DoubleSide. In 877, submitted calls
increase from 339 to 345 while triangles decrease by 162. These are counters,
not GPU timings or evidence of a net performance improvement.

Both reports show `cleanup.closed=true`, `contextLost=true` and no errors.
Browser error logs were empty; tabs closed and final inventory was empty.
No GPU timer queries, memory probes or concurrent rendering contexts were used.

Tab 875 also produced a game-distance comparison with `qaDepth=off`. Its PNG
was retained by root and the feature branch, but the fixed report endpoint was
overwritten before root copied its raw JSON. Do not reconstruct that report or
treat 875/876 as a fully evidenced paired depth experiment. The earlier
873/874 reports retain the independent off/front depth witnesses.

Next gates remain continuous growth/harvest-delivery behavior, unoccluded
multiview regression and paired GPU timing in the actual world. No model
promotion or production culling change follows from these screenshots alone.
