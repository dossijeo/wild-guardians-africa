// Unpaired events and failed previews are retained only until the matching
// input receipt arrives. Overflow fails closed instead of reviving a ghost.
export function createWebGpuStructurePreviewState({capacity=256,onRemove=()=>{}}={}){
 if(!Number.isSafeInteger(capacity)||capacity<1||typeof onRemove!=='function')throw TypeError('Invalid structure preview state');
 const active=new Map(),unmatched=new Map(),abandoned=new Map();let saturated=false;
 function remove(id){if(active.delete(id))onRemove(id);}
 function confirm(id,targetId){if(typeof targetId!=='string'||!targetId)return false;const lost=abandoned.get(id);if(lost){if(lost.seen)abandoned.delete(id);else lost.settled=true;return false;}const item=active.get(id);if(!item)return false;item.targetId=targetId;return true;}
 return {
  begin(id){if(saturated)throw Error('Structure preview history saturated');if(typeof id!=='string'||!id||active.has(id)||abandoned.has(id)||active.size>=capacity)throw TypeError('Invalid structure preview');const prior=unmatched.get(id)??null;unmatched.delete(id);if(prior?.removed)return false;const targetId=prior?.targetId??null;active.set(id,{targetId});return targetId;},
  abandon(id){if(typeof id!=='string'||!id||abandoned.has(id))return;const seen=!!active.get(id)?.targetId,unpaired=unmatched.delete(id);remove(id);if(abandoned.size>=capacity){saturated=true;return;}abandoned.set(id,{seen:seen||unpaired,settled:false});},
  confirm,
  reject(id){remove(id);unmatched.delete(id);abandoned.delete(id);},
  reconcile(events,hasVisible,{ignoreUnmatched=false}={}){for(const event of events??[]){
   if(['WallRemoved','StructureRuined'].includes(event?.type)&&typeof event.targetId==='string'){for(const item of unmatched.values())if(item.targetId===event.targetId)item.removed=true;for(const [id,item] of active)if(item.targetId===event.targetId)remove(id);}
   if(!['PlacementCommitted','WallChainBuilt'].includes(event?.type)||typeof event.commandId!=='string'||typeof event.targetId!=='string')continue;
   const lost=abandoned.get(event.commandId);if(lost){if(lost.settled)abandoned.delete(event.commandId);else lost.seen=true;continue;}
   if(!confirm(event.commandId,event.targetId)&&!ignoreUnmatched){if(!unmatched.has(event.commandId)&&unmatched.size>=capacity)saturated=true;else unmatched.set(event.commandId,{targetId:event.targetId,removed:false});}
  }for(const [id,item] of active)if(item.targetId&&hasVisible(item.targetId))remove(id);},
  get size(){return active.size;},get saturated(){return saturated;},clear(){for(const id of [...active.keys()])remove(id);unmatched.clear();abandoned.clear();saturated=false;}
 };
}
