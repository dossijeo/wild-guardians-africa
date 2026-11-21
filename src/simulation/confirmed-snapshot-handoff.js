// Private handoff between the incremental transport and the receiver. The
// snapshot is still validated by the receiver and never becomes simulation
// authority. Weak ownership avoids putting mutable state on the wire object.
const snapshots=new WeakMap();
export function handoffConfirmedSnapshot(publication,snapshot){snapshots.set(publication,snapshot);}
export function confirmedSnapshotFor(publication){return snapshots.get(publication);}
// Copy metadata without evaluating a lazy snapshot or losing its decoded base.
export function copyPublication(publication,{omit=[],add={}}={}){
 const descriptors=Object.getOwnPropertyDescriptors(publication);for(const key of omit)delete descriptors[key];
 const result=Object.defineProperties({},descriptors);Object.assign(result,add);
 const snapshot=confirmedSnapshotFor(publication);if(snapshot!==undefined&&!omit.includes('snapshot'))handoffConfirmedSnapshot(result,snapshot);
 return result;
}
