// Unpaired events and failed previews are retained only until the matching
// input receipt arrives. Overflow fails closed instead of reviving a ghost.
export function createWebGpuStructurePreviewState({capacity=256,onRemove=()=>{}}={}){
 if(!Number.isSafeInteger(capacity)||capacity<1||typeof onRemove!=='function')throw TypeError('Invalid structure preview state');
 const active=new Map(),unmatched=new Map(),abandoned=new Map();let saturated=false;
 function remove(id){if(active.delete(id))onRemove(id);}
 function remember(id,seen,settled){if(seen&&settled)return;if(abandoned.size>=capacity){saturated=true;return;}abandoned.set(id,{seen,settled});}
 function retire(id,item){remove(id);remember(id,item.eventSeen,item.receiptSeen);}
 function record(id,targetId,event){if(typeof targetId!=='string'||!targetId)return false;const lost=abandoned.get(id);if(lost){if(event)lost.seen=true;else lost.settled=true;if(lost.seen&&lost.settled)abandoned.delete(id);return false;}const item=active.get(id);if(!item||item.targetId&&item.targetId!==targetId)return false;item.targetId=targetId;if(event)item.eventSeen=true;else item.receiptSeen=true;return true;}
 const confirm=(id,targetId)=>record(id,targetId,false);
 return {
  begin(id,{requireEvent=false}={}){if(saturated)throw Error('Structure preview history saturated');if(typeof id!=='string'||!id||typeof requireEvent!=='boolean'||active.has(id)||abandoned.has(id)||active.size>=capacity)throw TypeError('Invalid structure preview');const prior=unmatched.get(id)??null;unmatched.delete(id);if(prior?.removed)return false;const targetId=prior?.targetId??null;active.set(id,{targetId,targetIds:prior?.targetIds??null,requireEvent,eventSeen:!!prior,receiptSeen:false});return targetId;},
  abandon(id){if(typeof id!=='string'||!id||abandoned.has(id))return;const item=active.get(id),unpaired=unmatched.delete(id);remove(id);remember(id,item?.eventSeen||unpaired,item?.receiptSeen||false);},
  confirm,
  targets(id){const item=active.get(id)??unmatched.get(id);return item?.targetIds?[...item.targetIds]:null;},
  reject(id){remove(id);unmatched.delete(id);abandoned.delete(id);},
  reconcile(events,hasVisible,{ignoreUnmatched=false}={}){for(const event of events??[]){
   if(['WallRemoved','StructureRuined'].includes(event?.type)&&typeof event.targetId==='string'){for(const item of unmatched.values())if(item.targetId===event.targetId||item.targetIds?.includes(event.targetId))item.removed=true;for(const [id,item] of active)if(item.targetId===event.targetId||item.targetIds?.includes(event.targetId))retire(id,item);}
   if(!['PlacementCommitted','WallChainBuilt'].includes(event?.type)||typeof event.commandId!=='string'||typeof event.targetId!=='string')continue;
   const ids=event.type==='WallChainBuilt'?event.presentation?.targetIds:null,targetIds=Array.isArray(ids)&&ids.length>0&&ids[0]===event.targetId&&ids.every(id=>typeof id==='string'&&id)&&new Set(ids).size===ids.length&&ids.length===event.count?ids.slice():event.type==='PlacementCommitted'?[event.targetId]:null;
   const lost=abandoned.get(event.commandId);if(lost){record(event.commandId,event.targetId,true);continue;}
   if(record(event.commandId,event.targetId,true))active.get(event.commandId).targetIds=targetIds;
   else if(!active.has(event.commandId)&&!ignoreUnmatched){if(!unmatched.has(event.commandId)&&unmatched.size>=capacity)saturated=true;else unmatched.set(event.commandId,{targetId:event.targetId,targetIds,removed:false});}
  }for(const [id,item] of active)if(item.targetId&&(!item.requireEvent||item.targetIds)&&((item.targetIds??[item.targetId]).every(hasVisible)))retire(id,item);},
  get size(){return active.size;},get saturated(){return saturated;},clear(){for(const id of [...active.keys()])remove(id);unmatched.clear();abandoned.clear();saturated=false;}
 };
}
