# Original regression fixture reconciliation review

Source inspected read-only:36a0e204 in the isolated campaign branch while its
paired pilot runs. No source of that running pilot was changed. The archived
d4d12580/a6893053 original21-test results remain15pass/6fail; this review does
not waive any failure or assert that the original suite is green.

The original acceptance-clock fixture uses a navigation double with no
segmentClear and no native entry-route preparation. Four failures were observed
before the cooperative implementation. Its calm-day/night case also allows
production's guaranteed night plan despite claiming a calm-night clock test.
The two failing horde-entry-retry cases expect immediate synchronous12-actor
entry after expanding bounds, despite the deliberate bounded synchronous
budget and asynchronous preparation contract. Their side/strike RNG and dawn
invariants remain required.

The newer native fixtures have already passed root's independent10-test replay.
They provide the following migration map, preserving original assertions:

| Original contract | Real-navigation replacement |
| --- | --- |
| Accelerated arrival and normal animal speed | Prepared QA011 boundary, elapsed values and0.038 movement |
| One frame equals boundary-split frames | Prepared QA011 exact time/position/event equality |
| Daylight and calm night reach blocked dawn | QA009/010/015 explicit isolated calm plan,60 real night seconds, one Dawn and frozen hiring |
| Fractional daylight/night frame | QA009/010 each side retains its own clock speed |
| Last animal exit restores acceleration | QA012/013 actual route to exact physical exits; one end event |
| Calm night preserves growth/tolerance | QA010 unchanged paid plant after explicit calm night |
| All blocking pauses retain every field | QA007/014 real navigation, serialized equality until both pause causes clear |
| Entry retry at600 preserves selected side | Prepared whole-group entry; no clocks/state/RNG allocation while pending |
| First successful spawn RNG order | Original side draw followed by each original species strike draw, full12 actors |

Recommended next change, only after terminal pilot evidence is archived: fold
these native fixtures into the original two test files with a shared real
preparation helper, retaining the other four retry/cache/persistence tests and
the independent reservation tests. Remove redundant copies only when their
assertions are retained in the original suite. Keep paid-farm integration
separate. Do not add a permissive segmentClear stub, manufacture exits, expand
production budgets, relax clock/RNG assertions or remove failing gates.

This is a source review and migration recommendation, not an implemented patch,
regression pass, physical/browser acceptance or campaign balance approval.
