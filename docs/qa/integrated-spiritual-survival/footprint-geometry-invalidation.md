# Native footprint query invalidation

An existing mutable-footprint regression failed after exact fractional navigation caching: the exit connector detected changed vertices but the live navigator retained collision results and broad-phase bounds for the previous geometry. The before-failure receipt preserves 11/12 results. A trial using a fresh placement view passed connector tests but was rejected because actual movement still used the stale source navigator.

The accepted correction invalidates the native topology epoch and collision/route caches, rebuilds obstacle bounds, and persists the epoch only on the navigator owning live state. Hypothetical placement views cannot mutate the live saved epoch. Invalidation occurs only when a selected footprint actually changes in place without an existing epoch change; ordinary per-frame queries keep their caches.

The regression validates every returned waypoint and swept segment on the actual navigator. A second test enlarges a footprint, verifies the formerly clear coordinate becomes blocked, and verifies placement-view isolation. The focused navigation, reservations, canyon retreat, fractional caching and service-component suite passes 50/50. Vite builds in 10.21 seconds; the existing bundle-size warning remains. These are functional CPU tests, not visual or GPU acceptance.

## Canyon perimeter evidence remains inconclusive

The retained corner connector candidate and `canyon-native-corner-proof-v1.json` are negative research evidence, not production code. All nine contour candidates remain uncertified at a fractional service pose. No failed path or empty connector set is accepted as proof of a closed perimeter. The native natural-river fixture passes, but the automated protected-canyon campaign still needs a defensible paid wall layout before balance acceptance. No raid strength, economics, or protection multiplier was changed to conceal that limitation.
