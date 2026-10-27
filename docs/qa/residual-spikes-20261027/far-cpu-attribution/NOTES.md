# Far CPU attribution, first pass
Single diagnostic on corrected lazy candidate, no errors and no dropped probe samples. See far-cpu-summary.json; totals are nested CPU wall times across all species, not GPU or per-frame percentiles.

Physical coverage99.55ms and prepared coverage93.53ms over roughly7000calls are small. Standby721.70ms and layer1263.36ms are larger; native fade506.58ms is nested in layer. Transition advance18.35ms. These totals alone do not explain all of world-frame-stage:3. No optimization decision yet. Next probe should include complete adapters, per-frame camera matrix updates, ground bounds and logical preload scheduling. The existing nativeTreePresence index is already shared and revision-cached; do not reimplement it.
