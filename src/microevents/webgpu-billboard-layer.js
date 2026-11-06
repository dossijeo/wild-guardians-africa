import {MicroeventBillboards} from './billboards.js';
import {createWebGpuMicroeventMaterial} from './webgpu-billboard-material.js';

// Graphics-worker consumer for the instance layout produced by the existing
// billboard emitter. It owns only presentation data, never event outcomes.
export function createWebGpuMicroeventLayer({scene,state,atlas,capacity=160}={}){
 if(!scene?.isScene||!state||!atlas?.isTexture||!Number.isSafeInteger(capacity)||capacity<1)throw TypeError('Invalid microevent layer');
 const adapter=createWebGpuMicroeventMaterial(atlas),billboards=new MicroeventBillboards({scene,state},{capacity,texture:atlas,materialAdapter:adapter});let closed=false,sequence=0;
 function update(frame){
  if(closed||!Number.isSafeInteger(frame?.sequence)||frame.sequence<=sequence||!(frame.instances instanceof Float32Array)||frame.instances.length%15||frame.instances.length>capacity*15||!Array.isArray(frame.origin)||frame.origin.length!==3||!frame.origin.every(Number.isFinite)||!Number.isFinite(frame.light)||!frame.instances.every(Number.isFinite))throw TypeError('Invalid microevent frame');
  sequence=frame.sequence;billboards.root.position.fromArray(frame.origin);billboards.buffer.array.set(frame.instances);billboards.count=frame.instances.length/15;billboards.mesh.geometry.instanceCount=billboards.count;billboards.buffer.needsUpdate=true;adapter.setLight(frame.light);billboards.root.visible=billboards.count>0;return sequence;
 }
 return {ready:billboards.ready,update,hide(){if(!closed)billboards.clear();},clear(next){if(closed||!Number.isSafeInteger(next)||next<=sequence)throw TypeError('Invalid microevent clear');sequence=next;billboards.clear();},status(){return {closed,sequence,count:billboards.count};},dispose(){if(closed)return;closed=true;billboards.dispose();}};
}
