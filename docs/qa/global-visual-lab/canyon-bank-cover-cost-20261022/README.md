# Authored canyon cover cost

Reproduce: Vite5190; node tools/experiments/measure-canyon-bank-cover-cost-20261022.mjs; python tools/experiments/audit-canyon-bank-cover-cost-20261022.py. Intel UHD ANGLE D3D11,1280x720/media,seed712. A/B/A/B regions/cover, day/night. Same moving4-unit camera, instances/draws/triangles.60 warmup+90samples, separate GPU and cadence passes.720 valid GPU queries, no errors/disjoints/pending, unchanged simulation. Geometry and camera signatures match across all arms. This is a mesh appearance comparison, not an optimization claim.

|Pair|GPU A/B ms|CPU A/B ms|RAF A/B ms|
|---|---|---|---|
|Day1|10.002/10.001|3.560/3.536|16.633/16.629|
|Night1|11.549/11.889|3.309/3.621|16.631/16.632|
|Day2|10.210/10.219|3.467/3.607|16.631/16.630|
|Night2|13.466/11.007|3.281/3.277|16.628/16.623|

Day GPU means closely match. Night variation changes sign (+.339,-2.459ms); cannot attribute a speedup or fixed overhead to the module. CPU has no consistent improvement. RAF remains paced near16.63ms, not uncapped FPS. Raw/p95 retained. Streaming suspended in both arms; memory-byte use and long-session lifecycle not measured. Keep the visibly stronger module for further QA; no evidence here of a repeatable large cost increase, but one device/scene is insufficient for general performance claims.
