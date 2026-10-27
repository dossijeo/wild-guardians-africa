# World-space ground support for the menu totem

The previous screen-space landscape and separate 3D totem moved differently. The existing ground/shadow pass now renders a horizontal textured surface with the totem VP and fixed world UVs. Distant and foreground plate parallax, route camera, firefly lighting and existing lifecycle remain intact. One additional 768-square RGBA texture (2.25 MiB base GPU storage, no mipmaps; 269740 bytes WebP) replaces the plain shadow appearance; no additional draw call or loop.

Wide, portrait and ultrawide home/parallax/options/return runs completed with all controls on screen. Twelve fixed-route screenshots captured; wide/portrait home and fractions .15/.35 inspected. New surface gives visible near ground rather than projecting distant huts beneath the totem. Baseline and candidate retain favicon.ico 404s; no other captured menu errors. Seventeen generation/library/overlay tests pass.

Short Intel UHD 720p balanced journey ABAB (150 draws per arm): mean GPU A 3.001/3.102 ms, B 3.207/3.411 ms; GPU P95 A 3.705/3.941, B 4.085/7.570. CPU means .250–.269 ms. Draw-interval P95 stays 18.63–18.84 ms and medians about16.7ms. This is an extra GPU cost, not a speed optimization; GPU tails are variable and the short series cannot prove equal cost or physical presentation latency. No claim of solving whole-game fluency. Baseline is main 2315e85e5.

Full packaging and integrated menu-to-game regression remain before main promotion. Local journey videos and other captures are retained in this directory and sibling totem-ground-journey; scripts reproduce them.
