# Deferred occupancy checks — 2026-10-29

Moved elevated candidate occupancy tests after lower-bound pruning, before visibility evaluation. Discarded candidates cannot win even if unoccupied. Relative enumeration tie order is preserved.

64-case comparison against 89c2bae4c still produces identical positions. Occupancy queries 9,792→3,030 and visibility queries 46,420→15,800 compared with the original exhaustive elevated search. [Parity receipt](occupancy-pruning-parity.json). All 18 placement tests pass; build passes, 535 modules, 15.73s, existing warnings.

[Browser result](occupancy-pruned-ui.txt): all eight one-Guardian/cleanup checks pass without errors, visually unchanged sheet. Current tower planning median day/night 5.635/4.19ms, p95 9.935/5.98ms, max 12.28/7.055ms. Previous visibility-pruned run was median 6.365/4.10ms and p95 12.905/5.62ms. Therefore no uniform timing improvement is established by these sequential small samples, despite provably fewer occupancy queries. No FPS or global performance acceptance is claimed.
