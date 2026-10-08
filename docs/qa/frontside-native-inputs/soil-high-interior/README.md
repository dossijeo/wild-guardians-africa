# Soil-only candidate: native visual rejection

Root ran the frozen subagent fixture at `c951754154b2722d33afd262528f16aaaf444cbd` with `blenderSoilReduction&derivedContractAudit&limit=1`. The candidate replaces mature maize soil with 770 triangles instead of 1102; stem and leaves remain exact. This is one TRAINING view before any FrontSide experiment. All four arms use DoubleSide.

Indexed original is pixel-identical to the original. The soil derivative fails: 520 missing and 525 added alpha pixels, 245/301 beyond one pixel, RGB MAE 0.00569024, maximum tile MAE 0.181839 and an interior missing region of 225 pixels. Splitting the same derivative into two DoubleSide groups also fails. The fixture's CPU/shader contract audit does not override the visual result.

The candidate remains rejected. No asset is promoted and no GPU benefit is claimed. Report and frame were copied from the server POST before releasing the source freeze; `browser.png` is the root browser screenshot. The fixture reported GPU disposal, the root closed tab 781, and captured warning/error logs were empty.

The URL carried an earlier expected four-campaign label. It does not certify four live processes: PID 20024 had already completed its Gran Río case. This is not a benchmark.

The receipt hashes 19 direct sources and the diagnostic; it is a partial source archive, with the complete fixture available at the tested commit. The subagent preserves the generated payload and recipe separately. Originals and production remain unchanged.
