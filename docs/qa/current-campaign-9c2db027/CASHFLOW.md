# Separate perimeter investment from operating cash

The offline campaign summary previously included paid `intensive-wall-*` debits
in `otherNet`, so building a perimeter also reduced the reported operating cash
flow. It now reports those debits as `wallCosts`, alongside the existing centre
investment, and adds `netCashFlowAfterConstruction`. The ending balance must
reconcile exactly with the 1,500-coin opening balance and this net cash flow.

Two new accounting tests pass: reconciliation of the recorded mixed 20-night
farm, and explicit classification of multiple synthetic perimeter debits plus
an unrelated adjustment. The existing recorded mixed-farm test also passes.
Synthetic ledger rows prove classification only; they do not prove a perimeter
was constructed or paid in gameplay.

No costs, profits, policy, simulation or running campaign inputs change. The
active 100-night campaign remains frozen on 9c2db027 and therefore retains its
original summary implementation. Its final report can be analysed with the new
summary after it actually terminates. The full biome/culture, defense, poor
management and idle-time acceptance remains open.
