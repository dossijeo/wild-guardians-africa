# Read-only derivative and next decisions

The original archive was frozen first in b734da8d and original process logs in 86ce792b. The derivative does not overwrite a native report, modify simulation state, revise a gate or repeat a campaign.

Reproduce from the repository root of frozen diagnostic branch commit
`0192865f77a25653ea46b10ad63d01b851aa25d0`. The auditor intentionally requires
the original pilot's 390 source hashes; it must not be run on a different runtime
and described as an exact-source reproduction. Main retains these diagnostic
documents without integrating the candidate gameplay parameters or tools.

```
node --test tests/horde-defense-terminal-derivative.test.js
node tools/audit_horde_defense_pilot.mjs docs/qa/horde-defense-pilot-88ebf647-20/native-original .cache/horde-pilot-independent-review.json
```

The auditor validates the archive manifest, all 390 frozen production/tool source hashes, native receipt hashes, exact native/annotated state equality, serialization roundtrip, complete native summary and strict strike gates. The separately returned wall counts use native wall status, not the centre-only operational predicate. Two tests passed (511.1252 ms): actual paid native wall construction and explicit missing/non-wall/damaged categories; both preserve their input state. The terminal auditor returned exit 0 after correction of its own initial diagnostic error. That first attempt incorrectly counted every zero-action decision as idle and failed its equality assertion before writing output. The corrected calculation reproduces the frozen producer's budget/space/shift-end filter exactly. This correction changes no original inactivity or acceptance result.

Responsible owned walls are 145 intact, all full HP, including four gates; the original 0 operational/145 ruined report remains preserved. Neither status counts nor full HP establish enclosure or protection: 27 expected modules were skipped and 132 living plants lie outside the initial perimeter. Responsible spent 1450 on wall construction and delivered 2609 crates; neglect spent zero on walls and delivered 2407. Harvest income/seed/wages are 191463/92181/36480 versus 158331/86596/36720. Ending money is 62052 versus 35715. Responsible allocated 297 strikes, spent 294, retired with three unused; neglect allocated 337, spent 334, retired with three unused. Actual consumers include worker encounters as well as crop/structure hit/miss. Maximum simultaneously reserved targets is seven in either arm. Neither arm lost.

Maintenance effectiveness is unproved: responsible issued fourteen repair requests, but zero arrived, restored HP or paid coins. Verified repair settlement coverage explicitly permits zero payments. No repair tasks remain at the terminal snapshot. There is no per-task cancellation receipt, so this report does not label each request cancelled or starved. Source evidence shows FIFO tasks reconstructed at dawn before repair requests and native route eligibility, while attacks remove repair tasks. These mechanisms are alternatives requiring targeted evidence, not an inferred fourteen-task cancellation history.

## Proposed next work, requiring review before execution

1. **Early activity:** both arms have exactly 674 idle seconds in the first five days before the paid wall branch diverges; a defence price adjustment cannot explain that shared opening. Keep centre 800, wages 30/40 and the unchanged reserve/policy. First inspect the already retained decisions by reserve component and physical first-delivery times, rather than raise yield blindly. If delivery latency rather than inaccessible tasks explains those windows, the bounded service hypothesis is a single 0.85 action-duration coefficient for initial planting/watering, preserving crop growth/checkpoints, FIFO, routes and payment. This is a proposed game parameter only, not implemented or approved. Native animation timing/visual compatibility and delivery evidence would be required before a pilot. If travel or staffing dominates instead, reject this hypothesis without spending a new twenty-night run on it.

2. **Maintenance:** start with an isolated legal snapshot fixture of a requested repair with its actual preceding FIFO tasks. Record reachability via native repairRoute, worker eligibility/reservation, request sequence and ahead-of-task count; advance ordinarily until arrival or an actual attack cancellation. The terminal campaign snapshot cannot supply the missing intraday history. A full paid repair must produce RepairApplied.repair plus its settled ledger debit. Diagnose route failure, busy worker backlog and interruption separately. Do not reorder repair priority, force arrival, pay at request or reinterpret zero payments as completed maintenance. The current centre HP and available money alone cannot resolve this.

3. **Defence and risk:** counts-first pilot did not create negligent defeat. It also did not validate effective paid repairs or a complete protected perimeter, so blindly adding animals is premature. The existing exclusivity rules remain intact. After the maintenance fixture and native gap/coverage attribution, propose a separate structure-damage step from the current half values to 0.75 of original damage (15/18.75/26.25/30/45), with exactly the same productive rules, hordes and crop two-hit rule in both arms. This is a hypothesis, not an implemented balance change or claimed outcome. Fractional HP, proportional rounded repair charges and first-five-night loss caps must be checked, and no campaign may start before review. Only effective paid maintenance/defence versus explicit omission can establish the desired management distinction.

No twenty-night result substitutes for responsible hundred-night global inactivity below 25%, nor for physical bad-management defeat, current compatibility or the thirty-case matrix. Both false activity gates and the false negligent-defeat gate remain visible. No new execution or promotion is authorised by this document.

## Independent root reproduction

Root ran both diagnostic tests (2/2 PASS, 477.6557 ms) and the complete read-only
auditor on the exact frozen checkout. Manifest, 390 source hashes, native and
annotated payload consistency, snapshot roundtrip, summaries and strike gates
reproduced successfully. False activity/neglect gates and zero repair payments
remain unchanged. An isolated legal repair fixture and read-only opening-activity
analysis are the next authorized diagnostics; no new campaign or balance change
is authorized yet.
