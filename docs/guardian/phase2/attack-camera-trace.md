# Camera trace alongside a real main-game Attack

Revision 071837033. Normal HUD interaction on qa-attack-gameplay; two earlier moving-target clicks missed and were not accepted as attacks. The retained take is the subsequent successful hit near the building, clock approximately 01:01, with no further input during its twenty-second recording.

202 samples: maximum camera-eye displacement from the first sample is exactly 0; maximum camera-target displacement is exactly 0. Raid camera travel is null and collision correction remains false. Therefore this take does not reproduce the prior framing change; it cannot attribute the earlier cause. No camera behavior was changed.

Recorded phase transitions (wall-clock seconds relative to first trace): falling .307, rolling 4.314, recovering 5.702, physical ownership released 9.717, attacking 10.100, waiting 11.610, walking 19.715. Building health changes 480 -> 420 after recovery, supporting resumed authoritative attack behavior. No console errors returned at the end. Main-game controls paused normally afterwards.

Inspected 1 fps contact sheet: one Guardian at the start, fall partly occluded by the building, supine/roll, recovery, standing and subsequent movement. Building occlusion prevents acceptance of every-frame skin/ground or structural penetration quality. Audio is present in the recorded stream but not perceptually accepted here. These traces run only for explicit recording and are not performance evidence.

Files: attack-camera-trace.json (raw diagnostic), attack-camera-trace.webm (VP9/Opus stream-copy remux of browser download), attack-camera-trace.jpg (contact sheet). The earlier unexplained camera movement remains a separate unresolved observation, not a proven Guardian camera regression.
