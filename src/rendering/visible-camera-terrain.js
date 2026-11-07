import {cameraTerrainHeights} from '../app/confirmed-camera-terrain.js';

// Camera data follows the revision actually published by the graphics owner.
// Keep only the latest not-yet-visible payload per chunk.
export function createVisibleCameraTerrain({residency,send}={}){
 if(typeof residency?.getVisible!=='function'||typeof send!=='function')throw TypeError('Invalid visible camera terrain');
 const pending=new Map();let closed=false;
 return {
  stage(payload,revision,{epoch,sequence,capturedAt=payload?.capturedAt}={}){if(closed)throw Error('Visible camera terrain closed');if(!Number.isSafeInteger(payload?.cx)||!Number.isSafeInteger(payload?.cz)||!Number.isSafeInteger(revision)||revision<1||typeof epoch!=='string'||!epoch||!Number.isSafeInteger(sequence)||sequence<0||capturedAt!==undefined&&(!Number.isFinite(capturedAt)||capturedAt<0))throw TypeError('Invalid camera terrain revision');pending.set(`${payload.cx},${payload.cz}`,{payload,revision,epoch,sequence,capturedAt});},
  published(key){if(closed)return;const item=pending.get(key);if(!item)return;const {payload,revision,epoch,sequence,capturedAt}=item,mesh=residency.getVisible(payload.cx,payload.cz);if(mesh?.userData?.spatialTerrainRevision!==revision)return;pending.delete(key);const mud=mesh.userData.mudSurface;send({cx:payload.cx,cz:payload.cz,revision,sequence,epoch,...(capturedAt===undefined?{}:{capturedAt}),heights:cameraTerrainHeights(payload),...(mud?{mud:{mudCenters:mud.mudCenters,mudOutlines:mud.mudOutlines}}:{})});},
  dispose(){closed=true;pending.clear();},
 };
}
