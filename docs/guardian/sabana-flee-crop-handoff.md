# Sabana worker evacuation and crop approach

This DEV qualification follows the Farm-to-flight handoff on the shared migration branch. Use both `qualifyFarmFlee` and `qualifyAnimalCrop`. The test starts from the paid day-two sabana712 opening, schedules the daytime warthog four seconds into the day and keeps the original worker, crops, terrain and balance.

## Run

With both matching native builds installed, run:

```sh
node --test tests/native-farm-raid-flight-savanna.test.js
```

The seven controls use the standalone WASM and the production authority, resource channel and Draw Host with a deterministic queue. On the Farm-only candidate the two-body test stops at the first advance spanning RaidSpawned with `Native task game cohort contains an unsupported mover`.

## What to look for

- Worker 21 retains body 1. If Farm has acquired, Stop24 samples its actual position and animation phases even when READY is delayed over multiple game steps. If Farm readiness arrives after the raid, it is cancelled and the original resting pose supplies the evacuation request.
- Warthog 22 starts on body 2. An unprepared route assignment followed by a request previously made Draw reject the missing revocation. The native planner now publishes its pending crop request at birth. Draw verifies its peer and matches the raid event against the worker's issued Home request before accepting route preparation.
- The crop target is plant-5. The Home route and crop route reach the same submitted packet with both ages advancing, the worker reaches the entrance at (60,0) with zero hits, and Home19 retires its presence while the crop route continues. The graphics fixture retains the sibling's buffer group across the worker's absence packet.
- The native admission checks the full extents of the two corridors, including stationary waits and retained endpoints. With these endpoints the minimum gap between the boxes is 7.68 m, above the 2.20 m encounter radius. Temporal sampling alone can miss an encounter between ticks. The raw WASM test checks that case, tangency, and an animal safe at the worker's origin but within encounter range farther along the Farm path. Overlapping boxes may reject a safely timed route.
- The process source is `spatial-intent-state.cpp` and the route proposal includes. The bridge revalidates peer ownership and separation at staging, retiming and acquisition. Game projects the active Farm until Stop24 commits. Active flight has a live presentation snapshot and remains excluded from disk checkpointing.

The distinction between a queued cancellation and finishing an active owner's transition also appears in OpenRA. Detour's moving-circle test illustrates why a time interval and the sum of radii matter for two bodies. Here the permanent separation check also covers independent GO retiming. [OpenRA Activity](https://github.com/OpenRA/OpenRA/blob/release-20250330/OpenRA.Game/Activities/Activity.cs#L183-L194) · [Detour obstacle avoidance](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourObstacleAvoidance.cpp#L323-L355)

## Physical acceptance and limits

Use the same day-two input, 25 chunks, bounds (24,-72,168,72), eye (83,24) and target (83,0). Check the first animal GO submit, at least two submitted pairs of advancing clock values, resident rig/buffer identities, Home19 absence and error-free drain. The CPU run measures neither physical frame cadence nor retention on NVIDIA.

A longer CPU run continued through two crop strikes and the native Retreat. A later advance at the raid exit still reaches the unsupported cohort guard around simulation time 665.05. Its civilian successor, actual worker encounters, Recovery and AttackCenter remain separate dependencies. Ordinary activation and 60 fps acceptance remain open.
