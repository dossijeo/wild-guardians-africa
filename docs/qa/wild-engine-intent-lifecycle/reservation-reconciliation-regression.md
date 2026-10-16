# Reservation reconciliation regression

The stacked algorithm branch's full repository run found a defensive lease
failure in `acceptance-defensive-reservations.test.js`. The focused test passed
on `main` but failed on the intent branch: a legacy caller directly replaced
an animal's wall claim without emitting an event, and the event-gated
reconciler retained its obsolete group reservation.

The fix performs a cheap ownership check only for the legacy navigation
adapter. Native intentions continue to reconcile from confirmed events and
topology revisions. A versioned, valid claim set restored from a save retains
its original insertion order on the first tick; rebuilding it unnecessarily
changed the exact serialized state. Invalid restored claims still rebuild.

`acceptance-defensive-reservations.test.js` and
`raid-individual-reservations.test.js` cover the direct legacy mutation,
unchanged-tick identity, target destruction, and save/reload replay. This
repair does not address the other failures observed in the stacked branch's
full repository suite; those require independent triage before integration.
