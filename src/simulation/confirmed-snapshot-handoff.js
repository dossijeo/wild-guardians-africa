// Private handoff between the incremental transport and the receiver. The
// snapshot is still validated by the receiver and never becomes simulation
// authority. Weak ownership avoids putting mutable state on the wire object.
const snapshots=new WeakMap();
export function handoffConfirmedSnapshot(publication,snapshot){snapshots.set(publication,snapshot);}
export function confirmedSnapshotFor(publication){return snapshots.get(publication);}
