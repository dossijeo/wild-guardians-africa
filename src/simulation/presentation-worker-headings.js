// Presentation-only compatibility state. The simulation's own heading and
// navigation are never changed. Only actors supplied by the initial legacy
// scene are tracked; a removed actor cannot silently inherit an old yaw.
export function createPresentationWorkerHeadingMap(seed){
 if(!Array.isArray(seed))throw TypeError('Invalid presentation heading baseline');
 const tracked=new Map();for(const item of seed){if(!item||typeof item.id!=='string'||!item.id||!Number.isFinite(item.yaw)||tracked.has(item.id))throw TypeError('Invalid presentation heading baseline');tracked.set(item.id,item.yaw);}
 return tracked;
}
export function createPresentationWorkerHeadings(seed,{initialWorkerIds=[]}={}){
 const tracked=createPresentationWorkerHeadingMap(seed),seen=new Set([...initialWorkerIds,...tracked.keys()]);
 return {
  capture(state){
   if(!Array.isArray(state?.workers)||!Array.isArray(state?.tasks))throw TypeError('Invalid presentation heading state');
   const workers=new Map(),added=new Set();for(const worker of state.workers){if(typeof worker?.id!=='string'||!worker.id||workers.has(worker.id))throw TypeError('Invalid presentation worker');workers.set(worker.id,worker);if(!seen.has(worker.id)){seen.add(worker.id);if(worker.status!=='home'){tracked.set(worker.id,0);added.add(worker.id);}}}
   let tasks;const changes=[];
   for(const [id,previous] of tracked){const worker=workers.get(id);if(!worker||worker.status==='home'){tracked.delete(id);changes.push({id,yaw:null});continue;}
    let yaw=previous;
    if(worker.status==='acting'){tasks??=new Map(state.tasks.map(task=>[task.id,task]));const task=tasks.get(worker.taskId);if(task?.kind==='initial'||task?.kind==='water')yaw=worker.heading??0;}
    if(worker.downHeading!==undefined&&(worker.fallRemaining>0||worker.recovery))yaw=worker.downHeading;
    else if(worker.path?.length){const next=worker.path[0];if(![worker.x,worker.z,next?.x,next?.z].every(Number.isFinite))throw TypeError('Invalid presentation worker path');yaw=Math.atan2(next.x-worker.x,next.z-worker.z);}
    if(!Number.isFinite(yaw))throw TypeError('Invalid presentation worker heading');if(added.has(id)||!Object.is(yaw,previous)){tracked.set(id,yaw);changes.push(added.has(id)?{id,yaw,add:true}:{id,yaw});}
   }
   return changes;
  },
  snapshot(){return [...tracked].map(([id,yaw])=>({id,yaw}));},
  status(){return {tracked:tracked.size};}
 };
}

// Collapsed quiet publications retain only the latest change for each actor.
// Null is an explicit removal, not an absent delta.
export function mergePresentationWorkerHeadings(earlier=[],later=[]){
 const merged=new Map();for(const list of [earlier,later]){if(!Array.isArray(list))throw TypeError('Invalid presentation heading deltas');const seen=new Set();for(const item of list){if(!item||typeof item.id!=='string'||!item.id||seen.has(item.id)||item.yaw!==null&&!Number.isFinite(item.yaw)||merged.get(item.id)?.yaw===null&&item.yaw!==null)throw TypeError('Invalid presentation heading delta');seen.add(item.id);merged.set(item.id,{id:item.id,yaw:item.yaw});}}
 return [...merged.values()];
}

// Validate before the confirmed state is committed. Apply only afterwards so a
// rejected publication cannot advance the fallback's presentation history.
export function preparePresentationWorkerHeadingDeltas(current,changes,state,previousState){
 if(!(current instanceof Map)||!Array.isArray(changes))throw TypeError('Invalid presentation heading receiver');
 const seen=new Set(),prepared=[];for(const item of changes){const add=item?.add===true;if(!item||typeof item.id!=='string'||!item.id||seen.has(item.id)||item.yaw!==null&&!Number.isFinite(item.yaw)||item.add!==undefined&&!add||add&&(current.has(item.id)||item.yaw===null||!state?.workers?.some(w=>w.id===item.id&&w.status!=='home')||!Array.isArray(previousState?.workers)||previousState.workers.some(w=>w.id===item.id))||!add&&!current.has(item.id))throw TypeError('Invalid presentation heading delta');seen.add(item.id);prepared.push(add?{id:item.id,yaw:item.yaw,add:true}:{id:item.id,yaw:item.yaw});}return prepared;
}
export function applyPresentationWorkerHeadingDeltas(current,prepared){for(const item of prepared)if(item.yaw===null)current.delete(item.id);else current.set(item.id,item.yaw);}
export function assertPresentationWorkerHeadingCheckpoint(current,seed){
 if(!(current instanceof Map))throw TypeError('Missing presentation heading baseline');const expected=createPresentationWorkerHeadingMap(seed);if(current.size!==expected.size)throw Error('Presentation heading checkpoint mismatch');for(const [id,yaw] of expected)if(!current.has(id)||!Object.is(current.get(id),yaw))throw Error('Presentation heading checkpoint mismatch');
}
