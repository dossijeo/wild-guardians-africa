import {SpatialSurfaceView} from '../world/wild-engine/spatial-surface-view.js';

export class CameraTerrainUnavailable extends Error {
 constructor(x,z){super(`Confirmed camera terrain unavailable at ${x}, ${z}`);this.name='CameraTerrainUnavailable';}
}

// Main-thread read-only copy of committed GPU terrain. It never invents heights
// for absent chunks and cannot expose a publication ahead of main state.
export function createConfirmedCameraTerrain({canyon=false,maxPending=256,maxChunks=512}={}){
 if(typeof canyon!=='boolean'||!Number.isSafeInteger(maxPending)||maxPending<1||!Number.isSafeInteger(maxChunks)||maxChunks<1)throw TypeError('Invalid camera terrain options');
 const view=new SpatialSurfaceView(),versions=new Map(),pending=[];let confirmed=0,epoch=null,closed=false;
 function ingest(message){if(closed)throw Error('Camera terrain closed');if(!message||typeof message.epoch!=='string'||!message.epoch||!Number.isSafeInteger(message.sequence)||message.sequence<0||!Number.isSafeInteger(message.revision)||message.revision<1||!Number.isSafeInteger(message.cx)||!Number.isSafeInteger(message.cz)||!(message.heights instanceof Float32Array)||message.heights.length!==49*49||!message.heights.every(Number.isFinite))throw TypeError('Invalid camera terrain publication');if(epoch!==null&&epoch!==message.epoch)throw Error('Camera terrain epoch changed');const key=`${message.cx},${message.cz}`,previous=versions.get(key);if(previous&&(message.revision<=previous.revision||message.sequence<previous.sequence))throw Error('Stale camera terrain revision');if(!previous&&versions.size>=maxChunks)throw Error('Camera terrain chunk capacity exceeded');if(pending.length>=maxPending)throw Error('Camera terrain pending capacity exceeded');epoch=message.epoch;versions.set(key,{revision:message.revision,sequence:message.sequence});view.remove(message.cx,message.cz);pending.push({...message,heights:message.heights.slice()});apply();}
 function apply(){for(let i=0;i<pending.length;){const item=pending[i];if(item.sequence>confirmed){i++;continue;}pending.splice(i,1);if(versions.get(`${item.cx},${item.cz}`)?.revision!==item.revision)continue;const positions=new Float32Array(49*49*3);for(let n=0;n<item.heights.length;n++)positions[n*3+1]=item.heights[n];view.install({cx:item.cx,cz:item.cz,terrain:{positions}});}}
 return {canyon,ingest,confirm(sequence){if(closed||!Number.isSafeInteger(sequence)||sequence<confirmed)throw TypeError('Invalid camera terrain confirmation');confirmed=sequence;apply();},surface(x,z){const key=`${Math.floor((x+24)/48)},${Math.floor((z+24)/48)}`;if(!view.chunks.has(key))throw new CameraTerrainUnavailable(x,z);const height=view.surface(x,z);if(!Number.isFinite(height))throw new CameraTerrainUnavailable(x,z);return height;},status(){return {closed,epoch,confirmed,pending:pending.length,chunks:view.size};},dispose(){closed=true;pending.length=0;versions.clear();view.clear();}};
}

export function cameraTerrainHeights(payload){const positions=payload?.terrain?.positions;if(!(positions instanceof Float32Array)||positions.length!==49*49*3)throw TypeError('Invalid camera terrain payload');const heights=new Float32Array(49*49);for(let i=0;i<heights.length;i++)heights[i]=positions[i*3+1];return heights;}
