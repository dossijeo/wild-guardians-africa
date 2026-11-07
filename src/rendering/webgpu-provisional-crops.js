import {ProvisionalCrops} from './provisional-crops.js';

// Input and confirmed events use independent channels. Retain only the
// identities needed to reconcile either ordering, with a bounded failure mode.
export function createWebGpuProvisionalCrops({now=()=>performance.now(),capacity=256}={}){
 if(!Number.isSafeInteger(capacity)||capacity<1)throw TypeError('Invalid provisional crop capacity');
 const crops=new ProvisionalCrops({now}),pending=new Map(),unmatched=new Map(),abandoned=new Map();let saturated=false;
 function confirm(id,targetId){
  if(typeof targetId!=='string'||!targetId)return false;
  const lost=abandoned.get(id);if(lost){if(lost.seen)abandoned.delete(id);else lost.settled=true;return false;}
  if(!crops.entries.has(id))return false;pending.set(id,targetId);return true;
 }
 return {
  begin(id,species,x,z){if(saturated)throw Error('Provisional crop event history saturated');if(typeof id!=='string'||!id||crops.entries.has(id)||abandoned.has(id)||crops.entries.size>=capacity||![x,z].every(Number.isFinite))throw TypeError('Invalid provisional crop');const prior=unmatched.get(id);if(prior){unmatched.delete(id);if(prior.destroyed)return;crops.begin(id,species,x,z);confirm(id,prior.targetId);return;}crops.begin(id,species,x,z);},
  abandon(id){if(typeof id!=='string'||!id||abandoned.has(id))return;const seen=pending.has(id),unpaired=unmatched.delete(id);pending.delete(id);crops.reject(id);if(abandoned.size>=capacity){saturated=true;return;}abandoned.set(id,{seen:seen||unpaired,settled:false});},
  confirm,
  // A published provisional batch may still be the only admitted geometry
  // when the authoritative plant first appears. Its old visual identity must
  // remain associated with the target until the replacement is published.
  targetFor(visualId){for(const entry of crops.entries.values())if(entry.plant.id===visualId)return entry.targetId;return null;},
  reject(id){pending.delete(id);crops.reject(id);unmatched.delete(id);abandoned.delete(id);},
  visible(plants,events=[],{ignoreUnmatched=false}={}){
   const destroyed=new Set();for(const event of events){
    if(['CropDestroyed','CropPicked'].includes(event?.type)&&typeof event.targetId==='string'){destroyed.add(event.targetId);for(const value of unmatched.values())if(value.targetId===event.targetId)value.destroyed=true;}
    if(event?.type!=='CropPlaced'||typeof event.commandId!=='string'||typeof event.targetId!=='string')continue;
    const lost=abandoned.get(event.commandId);if(lost){if(lost.settled)abandoned.delete(event.commandId);else lost.seen=true;continue;}
    if(!confirm(event.commandId,event.targetId)&&!ignoreUnmatched){if(!unmatched.has(event.commandId)&&unmatched.size>=capacity)saturated=true;else unmatched.set(event.commandId,{targetId:event.targetId,destroyed:false});}
   }
   for(const [id,targetId] of pending){const plant=plants.find(p=>p.id===targetId);if(destroyed.has(targetId)||plant&&!plant.alive){pending.delete(id);crops.reject(id);}else if(plant){crops.confirm(id,targetId);pending.delete(id);}}
   return crops.visible(plants);
  },
  get size(){return crops.entries.size;},get needsFrameUpdate(){return crops.needsFrameUpdate;},get saturated(){return saturated;},clear(){pending.clear();unmatched.clear();abandoned.clear();crops.clear();saturated=false;}
 };
}
