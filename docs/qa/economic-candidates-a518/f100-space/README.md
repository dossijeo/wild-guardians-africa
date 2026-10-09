# F100 spatial and service attribution

Original frozen83b1 F100 remains rejected at7930/30000=26.4333% idle. This
diagnostic does not rerun, change policy, enlarge the experiment or reattribute
its4257 recorded space seconds. Native terminal audits remain the prerequisites.

`tools/diagnose_f100_space.mjs` verifies frozenHEAD/clean tracked files/all376
producer source hashes and the prior native terminal audit bound to original
stateSHA aa1c07343d598b5a5ea0da25465c571fe258df1069d1fc88e36fa632af44d31e.
It performs no ticks or game commands. The exact serialized state and original
file hash remain unchanged after observations. The bounded four native probes
and source assertions finished exit0 in1.86s; this is not a benchmark claim.
Root independently reproduced the four probes and terminal audits in isolated
`.cache/root-f100-space` / `.cache/root-f100-terminal` copies.

## What recorded space actually means

The frozen harness builds one list at startup from
`activeChunkRegion(center).bounds`: [-120,-72,120,168],240×240m. Its1.5m grid has
25921 candidates. A monotonically increasing cursor permanently skips candidates
whose placement or native roundtrip query fails at the time of examination.
It admits2695 unique plots and later reuses their vacant coordinates. It never
expands the rectangle, updates the candidates after camera travel, adds a centre
or retries discarded candidates. Its comment about no fixed plot limit should
therefore be read as no arbitrary numeric plant cap, not unlimited geography.

`act()` labels no-action as space once the cursor is exhausted, even if
`plant()` returned early because money was below seed+labour+maintenance. The
source-bound truth-table counterexample demonstrates this reporting ambiguity.
It does not establish how often it occurred in F100. Budget and space contribute
equally to idle, so correcting that label would not change7930 or pass25%.
The terminal admits5 vacant previously used plots; that is a final instant after
victory, not proof that those plots were available during the recorded idle.

## The real game can place crops beyond that rectangle

`Game.plant` checks native placement,1.1m crop separation and an operational
centre; it contains no activeChunkRegion rectangle. Navigation's activeBounds
is presentation/raid metadata, and `placement` does not consult it. The scene
refreshes its logical bounds when the camera moves. Those source facts alone
do not imply any outside point is reachable, especially in the canyon.

The actual native four probes demonstrate local legal expansion at both ends:

| Point | Outside fixed rectangle | Placement/separation | Native outward / return path |
| --- | --- | --- | --- |
| -19.5,-73.5 | South,1.5m | pass | 9 / 10 waypoints |
| -21,-73.5 | South,1.5m | pass | 9 / 10 waypoints |
| -10.5,169.5 | North,1.5m | pass | 5 / 5 waypoints |
| -9,169.5 | North,1.5m | pass | 5 / 5 waypoints |

These queries use the same radius.28, worker mode, default margin and origin
service point as the frozen harness. There are34 previously admitted plots on
these two boundaries. This proves that its exhausted finite search domain is
not identical to exhaustion of all legal game territory. Four points cannot
show that4257 seconds were recoverable, that unlimited expansion is possible,
or that workers could sustainably service a larger farm. No crops were added.

## Service and crop occupancy are also material

The final2690 live crops share one centre:1937 await initial watering,369 have
later water pending,217 are mature/harvest-requested and167 are growing. The
classification gives initial due precedence; all1937 have zero growth and none
is mature. The2843 tasks match these categories plus320 unpaid crates. The
actual appendTask/reserveTasks contract uses workerId; every terminal task has
an explicit workerId:null, not an absent field masquerading as unreserved.

Victory has already ended employment; only3 fleeing workers remain. Thus these
counts describe surviving backlog and occupancy, not day100 work utilization
or proof of pathfinding/FIFO failure. Initial watering locks growth correctly;
an unserviced crop occupies its plot until watered, harvested or destroyed.
Source FIFO remains creation-order with nearest eligible reachable worker.
Increasing income cannot by itself clear this physical queue, shorten journeys
or raise dawn's fixed living/12 staffing target. The ending2.81M coins and zero
budget idle afterday30 already establish that late money is not the binding
constraint in this control.

## Proposed next work, requiring review

Keep the original control, seed, fullfirst10, gates and its rejection intact.
First investigate actual service parameters rather than more income: bounded
native observations of queue wait versus walking/action/carry time, initial
watering ages and mature-to-physical-delivery latency in a crowded farm. Any
proposed movement/action/growth parameter must preserve physical delivery and
FIFO, improve real service with evidence and retain bad-management risk. This
snapshot alone does not select a parameter or justify faster simulated workers.

A future reporting-only correction could have plant attempts return their
actual failure cause and feed that cause into idle attribution. Directed tests
must cover exhausted cursor+insufficient money, exhausted cursor+vacant old
plot, true exhausted space, shift cutoff and magic-only action. Exact state,
commands, RNG and aggregate idle must match the old reporter; historical4257 is
never retroactively rewritten. No such runtime/harness correction is made here.

A possible *separate comparative scenario*, not replacement of F100, would use
the original grid/camera/policy until exhaustion and then explicit player-like
camera exploration of adjacent native terrain. It must retain deterministic
seed/order, native placement/separation/roundtrip, no duplicates, real chunk
camera bounds, actual paid worker journeys and the same money/FIFO gates.
Tests must prove identical command/state prefix before first expansion, edge
continuity, blocked canyon/water cases, returning-camera behavior and physical
service under extra distance. This changes domain/exploration policy and needs
fidelity review before implementation; it cannot manufacture an approval of the
unchanged original test. No expansion, extra100 or promotion is authorized here.
