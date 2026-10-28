# Changing obstacles during worker recovery

The previous initial sweep could become stale when a wall or gate changed during the get-up. Worker recovery now rechecks the planned root travel with the existing navigation predicates in bounded 8 cm segments. If blocked, it caps the displacement already attained; the existing renderer correction eases toward that cap as the pose completes. Save state retains the cap, and final logical reconciliation uses it exactly once.

Validation: 14 tests passed across worker-recovery-state, worker-recovery-idle-exit and worker-recovery-boundaries. New cases cover a newly blocked route after recovery starts, save/resume of the capped motion, and a blocked swept segment during a large time step. The four existing skeletal boundary checks remain passing. Production build passed.

Limits: this constrains the planned root travel, not every articulated body part. It does not resolve a structure created directly over the already occupied body, and does not change beast recovery. Graphical validation with a changing obstacle is still pending; test success is not visual acceptance.
