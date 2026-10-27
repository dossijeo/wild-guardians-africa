# Native layered Mangrove moss

Opt-in `visualLab=global-lighting&mangroveMoss=layered`, normally combined with `mangroveSubstrate=full`. BiomeGround marks only Mangrove materials; AfricanToon composes the existing two-scale height blend before independent soil lighting. Same rotated .57 second scale, height-region mask, derivative-aware blend, rotated normals and combined ARH as retained QA. Separate program key. Defaults, other biomes, geometry and assets unchanged.

No new textures or passes compared with retained QA. This preserves its extra moss sampling (one ARH lookup plus conditional color/normal lookups), rather than making the effect cheaper. The approved vegetation remains unchanged in the capture; its leaf coverage still uses the QA adapter and is not integrated by this change.

## Verification

Run capture-mangrove-moss-native-20261022.mjs then audit-mangrove-moss-native-20261022.py under tools/experiments, Vite5190. Seed712/media/1280x720, visual time2, same three cameras, time150/350. Twelve real captures / six QA-native pairs: all pixel-exact, identical cameras/time/calls/triangles, no browser or GL errors. Day/night normal views inspected side by side.

Four tests pass: `node --test tests/global-mangrove-moss.test.js tests/global-mangrove-substrate.test.js`. Explicit gate, basic/standard ground paths, composition with/without separate soil illumination, transformed normals and distinct shader keys covered.

## Moving camera A/B/A/B

See ../mangrove-moss-native-cost-20261022. Run measure-mangrove-moss-native-20261022.mjs then audit-mangrove-moss-native-cost-20261022.py. Intel UHD ANGLE D3D11, media1280x720, same4-unit camera loop and animated retained vegetation,60warmup+90samples, separate GPU/cadence passes; no additional tasks launched while sampling. All720GPUqueries valid, no disjoint/error samples; per-frame camera/calls/triangles match exactly.

|Phase|GPU QA1/native1 ms|GPU QA2/native2 ms|CPU QA1/native1 ms|CPU QA2/native2 ms|
|---|---:|---:|---:|---:|
|Day|15.008/14.874|15.301/14.990|4.159/4.293|4.016/4.370|
|Night|15.484/15.542|15.347/16.073|4.152/4.280|3.931/4.179|

GPU differences -.135/-.311ms day,+.058/+.726ms night. CPU+.128 to+.354ms across all pairs. Cadence17.23-18.29ms, p95 23.6-36.6ms across runs: not stable uncapped FPS. The short test does not establish the cause of these differences; no optimization or zero-overhead claim. Raw samples/p95s retained.

## Decision and limitations

Keep the native option to preserve the accepted art and remove this shader's QA dependency. Do not discard the visual effect for the measured overhead; investigate it alongside the remaining leaf-coverage integration. No density or shader feature was reduced to improve benchmark numbers. Low-quality/portrait, rapid streaming, long-run resources and final mockup comparison remain pending. This is parity with the retained result, not proof that all Mangrove or six-biome goals are complete.
