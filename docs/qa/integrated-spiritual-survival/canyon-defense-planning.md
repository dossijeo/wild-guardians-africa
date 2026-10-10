# Canyon defense planning diagnosis

Input is the immutable seed-712 / Gran Cañón / Saheliana partial native state
from `pilot-v5-good-canyon-712-cache`, day 7 time 55. It is a diagnostic stop,
not a defeat. No prices, damage, terrain, crop income or production placement
rules were changed during this investigation.

The original nine rectangular proposals have 18–22 wall slots entirely on the
river, plus some tree/rock conflicts. Native wallPlacement rejects those slots.
Its restrictions differ from actor walking: workers/animals may cross canyon
water, but wall pieces entirely on water remain prohibited. Using an actor
navigation path as a wall-building path cannot establish legal placement.

Two isolated QA proposals were investigated:

1. Bounded A* checking native wall-placement segments, with dry-shore corner
selection and a row envelope preventing paths through the farm. It checks
actual placement instead of walkability. On this snapshot the tested routes
still fail closure. This remains an experimental diagnostic, not the policy's
accepted fallback. The earlier v1 probe mistakenly stopped after its first
failed route because two optional undefined counts compared equal; v2 corrected
the driver. None of v1–v7 is a frozen balance campaign or acceptance result.
2. A deterministic raster shore envelope follows the river rather than forcing
a rectangle over it. Native full quoting accepts 57/63, 58/66 and 64/70 slots
at padding 2, 3 and 4 respectively. Water rejection disappears in this sample,
but omitted slots remain at houses, large rocks/trees and crops very close to
the shore. No automatic gate is generated for these incomplete outlines.
They are not purchased or declared protective.

The frozen shore diagnostic contains input and runtime SHA-256 hashes, exact
coordinates, quotes and every omission. Exploratory negative receipts are
retained separately and are not used to approve a model. No prospective wall
was injected into live native state and no cultivation/ledger state changed.

## Implemented QA correction

The funded defense policy now remembers a failed geometric search only while
the navigator, terrain identity, topology epoch, completed bounds, live crop
coordinates and centre footprints are identical. It emits an explicit
`unchanged-geometric-planning-failure` record with no action/payment credit.
Changes invalidate it. Worker-observability/passage failures are not memoized.
Unpaid plans never become protection; successful proposals still use native
quotes, purchases, gates, navigation and repair settlement.

14 focused tests pass: native paid perimeters/repair, read-only quotes, cached
failures and invalidation, deterministic bounded shore geometry and wall-based
search. These tests do not establish that the canyon farm is now defended.

## Next calibration prerequisite

The current automated farmland layout places some crops very close to the
river and houses. Investigate defensible planting layout or a genuinely legal
outline around those obstacles. Keep protected and unprotected comparison
policies on disclosed, comparable native placement rules. Do not bypass fluid
restrictions, erase crops or lower proof standards merely to finish a campaign.
Only then resume the canyon comparison as a protected strategy.
