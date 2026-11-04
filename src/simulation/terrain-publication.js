// Confirmed terrain changes for a presentation Worker. The authority retains
// its own chunk arrays; only the copied rendering buffers are transferred.
// One publication may be in flight. Pending updates are coalesced per chunk.
export function createTerrainPublication({port,session,maxPending=512}={}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||!Number.isSafeInteger(maxPending)||maxPending<1)throw TypeError('Invalid terrain publication');
 const pending=new Map(),staged=new Map(),revisions=new Map();let inflight=null,serial=0,closed=false,failure=null,lastSequence=-1;
 function fail(error){if(closed)return;failure=error instanceof Error?error:Error(String(error));closed=true;pending.clear();staged.clear();try{port.postMessage({kind:'terrainFailure',session,message:failure.message});}catch{}try{port.close();}catch{}}
 function pump(){
  if(closed||inflight||!pending.size)return;
  const [key,entry]=pending.entries().next().value;pending.delete(key);inflight={id:++serial,key};
  try{const {payload,sequence,revision}=entry;const transfer=[payload.terrain.positions.buffer,payload.terrain.colors.buffer,payload.terrain.indices.buffer];if(payload.water)transfer.push(payload.water.buffer);port.postMessage({kind:'terrain',session,id:inflight.id,sequence,revision,payload},transfer);}catch(error){fail(error);}
 }
 function stage(data){
  if(closed)return false;
  if(data?.authority!=='spatial-wasm'||!Number.isSafeInteger(data.cx)||!Number.isSafeInteger(data.cz)||!(data.terrain?.positions instanceof Float32Array)||!(data.terrain?.colors instanceof Float32Array)||!(data.terrain?.indices instanceof Uint16Array))throw TypeError('Invalid authoritative terrain');
  if(data.water!==undefined&&(!(data.water instanceof Float32Array)||data.water.length%9!==0))throw TypeError('Invalid authoritative water');
  if(data.instances!==undefined&&(!Array.isArray(data.instances)||data.instances.length!==20||data.instances.some((list,slot)=>!Array.isArray(list)||list.some(item=>item?.slot!==slot||typeof item.id!=='string'||![item.x,item.y,item.z,item.yaw,item.sx,item.sy,item.sz].every(Number.isFinite)))))throw TypeError('Invalid authoritative instances');
  const key=`${data.cx},${data.cz}`;if(!staged.has(key)&&!pending.has(key)&&staged.size+pending.size>=maxPending){fail(Error('Terrain publication capacity exceeded'));return false;}
  staged.set(key,{authority:data.authority,cx:data.cx,cz:data.cz,terrain:{positions:data.terrain.positions.slice(),colors:data.terrain.colors.slice(),indices:data.terrain.indices.slice()},...(data.water===undefined?{}:{water:data.water.slice()}),...(data.instances===undefined?{}:{instances:data.instances.map(list=>list.map(item=>({...item})))})});return true;
 }
 function commit(sequence){
  if(closed)return false;if(!Number.isSafeInteger(sequence)||sequence<=lastSequence)throw TypeError('Invalid confirmed terrain sequence');lastSequence=sequence;
  for(const [key,payload] of staged){const revision=(revisions.get(key)??0)+1;revisions.set(key,revision);pending.set(key,{payload,sequence,revision});}staged.clear();pump();return !closed;
 }
 function discard(){staged.clear();}
 port.onmessage=({data})=>{if(closed)return;if(data?.kind!=='terrainAck'||data.session!==session||!inflight||data.id!==inflight.id){fail(Error('Invalid terrain acknowledgement'));return;}inflight=null;pump();};
 port.onmessageerror=()=>fail(Error('Terrain acknowledgement failed'));port.start?.();
 return {stage,commit,discard,fail,dispose(){if(closed)return;closed=true;pending.clear();staged.clear();port.close();},status(){return {closed,failure:failure?.message??null,inflight:!!inflight,pending:pending.size,staged:staged.size};}};
}
