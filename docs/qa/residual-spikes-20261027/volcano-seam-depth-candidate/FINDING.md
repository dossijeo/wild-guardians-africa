# Partial depth-preparation candidate: not accepted

Exact seam depth variant is prepared before seam publication using BuildingDestructionPass.prepareDepth and compileLoadingPrograms against the real world lighting recipe. Borrowed scene ownership restored synchronously, cancellation checked after readiness.26 focused tests passed (24 existing depth/seam tests,2 ownership/cancellation tests).

First diagnostic run still fails the performance goal: main CPU maximum193.96ms; presentation interval253.255ms; travel13.249s,settled17.789s versus prior diagnostic8.950s/9.792s. Single runs cannot establish regression magnitude, but cannot support adoption.

Slow GL calls now show smooth-far-opaque-v1 programs90/93 waiting105.96/107ms and base far-ground-native-water-mask-v1:resident-mask-v2 waiting26.07ms. No >=10ms seam-v2 program log call was recorded. This suggests the seam-specific preparation addresses only one of several depth-target variants; not proof of complete readiness. Need complete far-root depth preparation before publication, including base terrain and opaque tree transition variants. Do not merge this partial candidate or claim improved fluency.

24 compiler warnings remain. All240 travel frames advance simulation,15chunks created,zero stream failures. Raw attribution retained. Candidate code is intentionally experimental pending full integration and ABAB validation; no art changes.
