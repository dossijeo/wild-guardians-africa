import {physicsOwners} from './host-publication-queue.js';
import {confirmedSnapshotFor,handoffConfirmedSnapshot} from './confirmed-snapshot-handoff.js';

// Preserve lazy snapshots and their private decoded state when projecting an
// envelope in the host. Copying with object spread evaluates snapshot getters.
export function copyPublication(publication,{omit=[],add={}}={}){
 const descriptors=Object.getOwnPropertyDescriptors(publication);for(const key of omit)delete descriptors[key];
 const result=Object.defineProperties({},descriptors);Object.assign(result,add);
 const snapshot=confirmedSnapshotFor(publication);if(snapshot!==undefined&&!omit.includes('snapshot'))handoffConfirmedSnapshot(result,snapshot);
 return result;
}

// The graphical consumer receives the original publication directly. The
// interface consumer retains state, events and a compact collision boundary.
export function projectMainThreadPublication(publication){
 if(publication?.unchanged===true)return publication;
 const owners=physicsOwners(publication);
 if(owners===null)return publication;
 return copyPublication(publication,{omit:['physicsPose','physicsPoses','motionTrace','worldMotionTrace','presentationWorkerHeadings'],add:{physicsOwnerSummary:owners}});
}
