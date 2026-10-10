# Independent root review

The 17 archived payloads match the original manifest byte counts and SHA256
hashes. Root separately checked both original raw and annotated state/report
pairs before archiving. Both arms terminated after 20 nights with no native
defeat. The accepted inactivity gate remains false for both arms. This is not
100-night or 30-combination acceptance.

The responsible raw report records 14 repair commands on days 7–20, seven at
daytime zero. Their recorded balances range from 1984 to 43011 coins. There are
no completed repairs or payments. Daily pending task counts range from 651 to
1110 over those days (not a continuous measurement of queue size). Centre HP
is 470 after night seven and remains at that value in later daily snapshots.
These observations do not establish which individual repair failed or why.

Frozen source `88ebf647` requests repairs through normal Game.requestRepair,
after dawn reconstruction. The helper only requests intact damaged centres and
checks repair price plus labour reserve. Worker reservation uses ordinary FIFO
and requires a valid repairRoute; active incursions remove repair tasks. Each
mechanism is a possible contributor requiring separate evidence. Do not infer
effective maintenance from requests, or repair cancellation from zero payments.
No artificial queue priority or free repair is justified by this diagnosis.

The original owned-wall operational/ruined counters use a centre-only predicate
and are invalid for walls. Raw state contains 145 intact owned walls: 141 with
100/100 HP and four gates with 60/60 HP. Preserve the incorrect report as original
evidence; a corrected diagnostic must identify its derivation and scope.

Next balance work must address early budget inactivity, demonstrably effective
paid maintenance and risk from neglecting defenses. A 20-night survival result
does not prove that neglect cannot lose by night 100. The centre cost remains
800 and minimum wage remains 30. No next campaign or production promotion is
approved by this review.

Opening-budget observations can be reproduced with the adjacent
`opening-budget-analysis.mjs`, using only the retained raw report. Days 1–5 have
574 budget-idle seconds plus 100 shift-end seconds. No workers are observed idle
in those budget samples; walking worker-time exceeds acting worker-time on each
sampled day. This points toward checking travel/throughput as well as action
duration, but does not establish route lengths or a causal repair diagnosis.
The retained decision rows lack per-task identities, reserve breakdowns and
first-delivery timestamps. Do not invent those fields or approve a timing
coefficient from aggregate worker occupancy alone.
