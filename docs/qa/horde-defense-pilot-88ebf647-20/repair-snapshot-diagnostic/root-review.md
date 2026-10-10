# Root review of the partial repair diagnostic

Diagnostic source freeze: `7a42b018`; underlying gameplay source: `88ebf647`.
Root inspected the actual legal-command fixture and independently checked all
nine receipt hashes in the frozen candidate checkout. Two evidence tests pass
(405.739 ms). Main retains the snapshots/reports; the branch-specific diagnostic
tools are not integrated into main. Reproduction commands in the original README
require that frozen diagnostic checkout, not a different gameplay source.

The source deserializes the actual terminal snapshot, hires through Game.hire,
requests through Game.requestRepair and advances four ordinary quarter-second
ticks. Existing tasks are neither cleared nor reprioritized. Route queries leave
serialized state unchanged. No repair debit occurs at request; the only payment
in this interval is the ordinary 3180-coin hiring debit.

This partial fixture establishes three valid sampled repair routes, not repair
availability or completion. The actual task remains unassigned behind 1110
earlier FIFO tasks after one second. It cannot explain the original fourteen
requests or prove that this new request will remain blocked all day. The next
diagnostic must resume the exact retained final snapshot without repeating either
command, and preserve assignments, FIFO rank, disappearance events and payments
until completion, an observed cancellation or end of daylight. Its tool must be
frozen and reviewed before launch. No new campaign or parameter change follows.

The restricted opening reserve attribution is explicitly a derived counterfactual:
315 of 574 budget-idle seconds would afford labour reserve plus a seed if only
the maintenance reserve were omitted. It is not observed spend permission or
approval to remove the reserve. The centre/wage audio invariants remain intact.
