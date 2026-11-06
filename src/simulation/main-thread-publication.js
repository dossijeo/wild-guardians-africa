import {physicsOwners} from './host-publication-queue.js';
import {copyPublication} from './confirmed-snapshot-handoff.js';
export {copyPublication} from './confirmed-snapshot-handoff.js';

// The graphical consumer receives the original publication directly. The
// interface consumer retains state, events and a compact collision boundary.
export function projectMainThreadPublication(publication){
 if(publication?.unchanged===true)return publication;
 const owners=physicsOwners(publication);
 if(owners===null)return publication;
 return copyPublication(publication,{omit:['physicsPose','physicsPoses','motionTrace','worldMotionTrace','presentationWorkerHeadings'],add:{physicsOwnerSummary:owners}});
}
