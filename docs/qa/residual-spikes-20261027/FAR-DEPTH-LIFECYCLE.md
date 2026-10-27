# Selective far depth: lifecycle checks

Candidate e53c1c716, Manglares, medium, production visuals and default pthread streaming.

Context restore: authoritative snapshot unchanged, 92 old program leases abandoned, 36 retained after recovery; 41 programs and 77 draw calls after restoration. Recovery 1813 ms.

World exit: pending native work disposed, zero workers and late installations, scheduler pending/waiting zero, 92 retained leases released. Menu reached in 823 ms.

These are one-cycle correctness checks, not performance acceptance or a leak endurance test. Neither test suspended a pending depth compilation (compilationCancellation=null). Existing X4000 compiler warnings remain. Raw JSON and compressed logs retained.
