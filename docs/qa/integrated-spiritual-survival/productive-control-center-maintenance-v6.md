# Productive control maintenance correction

Frozen QA policy version v6 enables ordinary paid center maintenance for productive `no-walls` and `no-shield` controls. Neither builds or repairs walls; Shield permission remains true only for `no-walls`. Good, expansive and passive management retain maintenance; bad management deliberately neglects it.

This changes automated player decisions only. No production economy, HP, damage, salaries, worker task execution, prices or magic changed. The existing native loop requests a damaged operational center's repair when actual funds cover it plus the wage reserve. The worker still travels, the task remains in FIFO, and payment occurs only at real arrival. Attacks can still interrupt the order. It does not restore HP or grant credits directly.

Campaign protocol IDs and centerRepairByStrategy disclose the new policy version; full and partial reports record centerRepairEnabled. Previous v5 campaigns remain historical evidence and are not silently updated or continued under different rules.

The new control contract failed against v5 (three passed, one failed), then passed in the broader native campaign/ledger/repair regression after correction. A separately archived retained-state physical probe shows that maintenance is a real available action in the empty seed-123 farm: a 30-coin worker executes one 323-coin repair and restores 358 HP to 600 HP without changing the original snapshot. This is not evidence of subsequent survival.

No longer campaigns should run until the seed-2026 exterior entry failure is resolved. Revalidate controls under this version before approving joint economic balance. Do not use the earlier unmaintained-center control as final proof of inevitable financial ruin.
