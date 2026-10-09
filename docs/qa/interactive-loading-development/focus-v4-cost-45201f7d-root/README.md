# Same-V4 incremental focus cost

Eight native day/night A1/B1/B2/A2 arms,540frames each and300resolved GPU queries each. Base3101dbff, candidate focus patch45201f7d (day1.30/night3.00/edge.60). A removes only focus shader hooks and restores pre-focus analytic haze; both use identical V4 assets,1280×720/growth78/reduced-motion, same harness. Immutable inventories and predeclared protocol are in ../focus-v4-cost-protocol/. No previous arm was measured on night1.50.

GPU medians (ms): day A1/B1/B2/A2=3.0121/4.4773/4.5552/4.3035; night=5.4305/5.7439/5.7008/5.3921. Day AB+1.4652ms, BA+.2517ms; reference drift+1.2915ms retained. Night AB+.3133ms, BA+.3087ms. The predeclared >5% AND >.5ms increase in both orders does not activate, but this does not establish equality or cost neutrality. Night shows a small consistent observed GPU increase. No blind repeat is warranted.

verify.py independently computes exact medians, nearest-rank p95, maximum and disjoint draw/overlay CPU statistics, all recorded RAF intervals and tails; no startup/outliers removed. The first null RAF interval has no previous timestamp and is explicitly undefined. All2,400queries are resolved, zero disjoint/discard/overflow/pending. Each cleanup reports renderer0/0/0. Root tabs957–964 closed, viewportreset and Browser2empty. Console ANGLE warnings remain where recorded; not claiming globally empty console.

Only synchronous diorama GPU draws are timed; CSS excluded. No real loading readiness, actual menu, world GPU, physical peak RAM/VRAM, mobile or cold/full-cache claim. The initialization regression remains open; frame-slack stays off. No new visual approval, no PR.
