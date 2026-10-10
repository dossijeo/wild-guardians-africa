# Native daylight continuation: repair still pending

One authorised continuation, source a0c36ca7, command:

```
node tools/continue_horde_repair_snapshot.mjs docs/qa/horde-defense-pilot-88ebf647-20/repair-snapshot-diagnostic .cache/horde-repair-continuation-a0c36ca7-01
```

Node PID54232, original exec session33450, start2026-10-10T00:42:01.224Z. Same session returned actual exit0; PID was missing after termination. Native terminal status is **daylight-ended-repair-pending**, error null, 73019.2488ms status duration. This is an observed pending outcome, not a completed repair or campaign pass. Original stdout/stderr, status, provenance, initial/final states,1197-frame trace and1177 native events are archived byte-exact in archive-receipt.json before analysis. No rerun was performed.

The exact retained time1 snapshot advanced to time300 in day21, without rehire, request, player commands, a following night/day or simulated override. Completed nights remain20. Source checks found no changes (390 frozen modules plus two continuation modules). Native settlement observation is verified with zero completed/paid repairs, zero restored HP and no missing coverage. There was no raid onset and no repair cancellation in this interval.

Repair task-62110 is never sampled reserved or assigned. Its actual created+ID FIFO rank falls from1110 to417:141 harvest+348water+571initial+50crate ahead initially, versus367initial+50crate at daylight end. Native work eliminates693 preceding tasks in the interval. The centre remains470HP. This legal repair did not reach assignment before the day's end while prior work remained. It does not recover the missing histories of the original fourteen requests, and sampled status does not provide exact substep idle/reservation timestamps.

106workers initially walking become96returning+10acting at300; all have reached their profile's shift end. No sampled idle workers appear. Left-endpoint phase actor-seconds are walking25037.75, acting3217.75, carrying3438.5, over299 player simulated seconds. These are labour totals, not travel metres, player inactivity or a GPU measure. Native events record552WaterSatisfied,141CropPicked,141CrateDelivered,171CropMatured,171HarvestRequested andNightStarted at the exact300 boundary. No nighttime step occurs.

All141 new ledger entries are real delivered-crate payments, each matching its crate's rounded value; income50679 grows balance58872→109551. Existing ledger entries and command IDs remain unchanged. Funding therefore did not prevent this repair in this fixture; no charge was attempted because no arrival occurred. Three route probes in the earlier one-second fixture showed routes from those sampled workers, not universal route availability or willingness to skip FIFO.

Reproduce read-only audit (no simulation):

```
node tools/audit_horde_repair_continuation.mjs docs/qa/horde-defense-pilot-88ebf647-20/repair-continuation-a0c36ca7 .cache/horde-repair-independent-audit.json
node --test tests/horde-repair-continuation-audit.test.js
```

Auditor exit0, receipt test1/1PASS449.5339ms, exact source/payload hashes, snapshot roundtrips, queue endpoints, native event identities, clocks, original commands and delivered payments verified. The archive is not mutated by these checks. No balance acceptance follows.

## Proposed staffing comparison, not implemented or executed

Maintain productive economics, centre800, wages30/40, FIFO/route/body rules, animal counts/damage and reserves. In a separately named protocol, both defence and neglect arms must use the same productive staffing rules; quantities remain endogenous to paid costs and losses. Preserve the original dawn-only20-night result unchanged.

First isolate the already-supported **middayHiring:true with plantsPerWorker:12**. It pays actual proportional wages, respects the next-day full-wage and maintenance/defence reserves, and hires only before profile end minus20seconds. It can respond to crops placed after dawn; its affordability check can also prevent hiring exactly when budget is constrained. Arrival travel may make late hiring ineffective. No automatic effectiveness is claimed. The day21 fixture already has the target106workers at its1272living/12 ratio, so midday hiring at the same ratio cannot solve this fixed cohort's overload by itself.

If that comparison establishes the same unresolved capacity mismatch, the next isolated staffing target proposal is **plantsPerWorker:6**, with midday mode unchanged in both arms. This is a changed productive policy, not an alteration or reinterpretation of the frozen test. At1272living, ratio12 requires106workers/3180daily coins; ratio8 would require159/4770; ratio6 requires212/6360. Existing day21 funds can pay212 and preserve6360 tomorrow plus the actual repair reserve, without synthetic funding. The observed693 preceding completions/106workers give only a descriptive6.54 tasks perworker; scaling that linearly predicts ratio8 still short and ratio6 potentially sufficient. That calculation is not a validated capacity law: collisions, routes, workload mix, new checkpoints and hire arrival can defeat linear scaling. Opening wages would rise and may worsen initial budget and eventual survival; no threshold or reserve is removed to hide it.

Before accepting such a rule, measure paid staffing, delivery and repair settlement, real queue service/reservations, available money and intro losses on the same lawful terrain. Compare responsible paid walls/repairs with neglect explicitly omitting those expenses under the same new productive rule. Do not reorder repairs, force movement, grant workers/funding, change crop/hit rules, enlarge the domain or use a staffing change to relabel the old global activity failure. No new damage step is proposed before this service issue is evaluated. Neither20-night inactivity nor a linear staffing projection approves100-night/global<25%, negligent defeat or a30-case matrix.
