import {cameraTerrainHeights} from '../app/confirmed-camera-terrain.js';
import {validateTerrainResourceRemoval} from '../world/terrain-resource-removal.js';

// Camera data follows the revision actually published by the graphics owner.
// Keep only the latest not-yet-visible payload per chunk.
export function createVisibleCameraTerrain({residency,send}={}){
 if(typeof residency?.getVisible!=='function'||typeof send!=='function')throw TypeError('Invalid visible camera terrain');
 const pending=new Map(),versions=new Map();let closed=false;
 function accept(cx,cz,revision,epoch,sequence){
  const key=`${cx},${cz}`,previous=versions.get(key);
  if(previous&&previous.epoch!==epoch)throw Error('Visible camera terrain epoch changed');
  if(previous&&(revision<=previous.revision||sequence<previous.sequence))return false;
  versions.set(key,{revision,epoch,sequence});return true;
 }
 return {
  stage(payload,revision,{epoch,sequence,capturedAt=payload?.capturedAt}={}){if(closed)throw Error('Visible camera terrain closed');if(!Number.isSafeInteger(payload?.cx)||!Number.isSafeInteger(payload?.cz)||!Number.isSafeInteger(revision)||revision<1||typeof epoch!=='string'||!epoch||!Number.isSafeInteger(sequence)||sequence<0||capturedAt!==undefined&&(!Number.isFinite(capturedAt)||capturedAt<0))throw TypeError('Invalid camera terrain revision');if(!accept(payload.cx,payload.cz,revision,epoch,sequence))return false;pending.set(`${payload.cx},${payload.cz}`,{payload,revision,epoch,sequence,capturedAt});return true;},
  published(key){if(closed)return;const item=pending.get(key);if(!item)return;const {payload,revision,epoch,sequence,capturedAt}=item,mesh=residency.getVisible(payload.cx,payload.cz);if(mesh?.userData?.spatialTerrainRevision!==revision)return;pending.delete(key);const mud=mesh.userData.mudSurface;send({cx:payload.cx,cz:payload.cz,revision,sequence,epoch,...(capturedAt===undefined?{}:{capturedAt}),heights:cameraTerrainHeights(payload),...(mud?{mud:{mudCenters:mud.mudCenters,mudOutlines:mud.mudOutlines}}:{})});},
  removed(payload,revision,{epoch,sequence,capturedAt=payload?.capturedAt}={}){
   if(closed)throw Error('Visible camera terrain closed');validateTerrainResourceRemoval(payload);
   if(!Number.isSafeInteger(revision)||revision<1||typeof epoch!=='string'||!epoch||!Number.isSafeInteger(sequence)||sequence<0||capturedAt!==undefined&&(!Number.isFinite(capturedAt)||capturedAt<0))throw TypeError('Invalid camera terrain retirement');
   const {cx,cz}=payload,key=`${cx},${cz}`,previous=versions.get(key);
   if(previous&&previous.epoch!==epoch)throw Error('Visible camera terrain epoch changed');
   if(previous&&(revision<=previous.revision||sequence<previous.sequence))return false;
   if(residency.getVisible(cx,cz))throw Error('Retired camera terrain is still visibly resident');
   if(!accept(cx,cz,revision,epoch,sequence))return false;pending.delete(key);
   send({cx,cz,revision,sequence,epoch,removed:true,...(capturedAt===undefined?{}:{capturedAt})});return true;
  },
  dispose(){closed=true;pending.clear();versions.clear();},
 };
}
