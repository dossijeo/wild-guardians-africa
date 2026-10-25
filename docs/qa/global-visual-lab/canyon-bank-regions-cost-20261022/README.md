# Canyon regional vegetation cost

Reproduce: Vite5190; node tools/experiments/measure-canyon-bank-regions-cost-20261022.mjs; python tools/experiments/audit-canyon-bank-regions-cost-20261022.py. Intel UHD ANGLE D3D11,1280x720/media,seed712. A/B/A/B scatter/regions, each day/night. Identical 4-unit moving camera path.60 warmup+90 samples/pass; GPU timer and cadence measured separately.720 valid GPU samples, no disjoint/pending/errors or simulation changes. Repeat geometry/calls within each variant exact; camera path across variants exact. Geometry intentionally differs between variants.

|Pair|GPU A ms|GPU B ms|Delta ms|CPU A/B ms|RAF interval A/B ms|
|---|---:|---:|---:|---|---|
|Day1|10.364|10.544|+.181|3.826/3.629|16.628/16.634|
|Night1|12.112|12.431|+.319|3.344/3.249|16.573/16.631|
|Day2|9.968|11.176|+1.209|3.696/3.537|16.628/16.631|
|Night2|11.882|13.744|+1.861|3.398/3.311|16.629/16.632|

GPU mean rises in all pairs, with substantial run variation; do not describe the additional coverage as free or infer a precise fixed cost. CPU submission differences do not prove a CPU optimization. Paced RAF stays near16.63ms and is not GPU execution time or uncapped FPS. p95/raw data retained in summary/benchmarks. Resident streaming suspended equally; no streaming latency, allocation-byte or long-session leak conclusion.

Keep regional placement as an artistic prototype; do not reject it solely for this GPU cost. The stronger limitation remains thin, isolated authored tufts rather than collective vegetation mass. Improve that representation before native adoption or density escalation.
