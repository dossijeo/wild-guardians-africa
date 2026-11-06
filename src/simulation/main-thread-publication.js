import {physicsOwners} from './host-publication-queue.js';
import {copyPublication,confirmedSnapshotFor} from './confirmed-snapshot-handoff.js';
import {projectConfirmedHud} from './confirmed-hud-projection.js';
export {copyPublication} from './confirmed-snapshot-handoff.js';

// The graphical consumer receives the original publication directly. The
// interface consumer retains state, events and a compact collision boundary.
export function projectMainThreadPublication(publication,{hud=false}={}){
 if(typeof hud!=='boolean')throw TypeError('Invalid HUD projection option');
 if(publication?.unchanged===true)return publication;
 const owners=physicsOwners(publication);
 if(owners===null)return publication;
 const hudProjection=hud?projectConfirmedHud(confirmedSnapshotFor(publication)??JSON.parse(publication.snapshot),publication.sequence):null;
 return copyPublication(publication,{omit:['physicsPose','physicsPoses','motionTrace','worldMotionTrace','presentationWorkerHeadings'],add:{physicsOwnerSummary:owners,...(hudProjection?{hudProjection}:{})}});
}
