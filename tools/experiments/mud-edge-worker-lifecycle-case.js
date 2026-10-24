import {prepareTerrainChunk,discardPreparedTerrain} from '/src/rendering/prepare-terrain-chunk.js';
// Correctness-only fault injection: hold delivery of a real worker result.
export async function verifyMudWorkerLifecycle(world,mode){
 if(!['quality','failure','exit'].includes(mode)||!world.frameScheduler||!world.mudEdgeExecutor)throw Error('Missing worker lifecycle fixture');
 const executor=world.mudEdgeExecutor,core=world.spatialSession.core;
 const group=[...world.chunks.values()].find(g=>g.children.some(m=>m.name==='mangrove-mud-patches'));
 if(!group)throw Error('Missing resident mud');const [x,z]=group.userData.nativeChunkOrigin,cx=x/48,cz=z/48;
 if(core.selectChunk(cx,cz)<0)throw Error('Missing authoritative resident chunk');const data=core.chunkPayload();
 const beforeKeys=[...world.chunks.keys()].sort().join('|'),beforeElapsed=world.state.elapsed,previousReceive=executor.receive,previousDispose=world.disposePreparedTerrain;
 let held=null,disposedPrivate=0,result=null;const owner=new AbortController();
 executor.receive=function(message){held=message;};world.disposePreparedTerrain=function(g){disposedPrivate++;return previousDispose.call(this,g);};
 const until=async check=>{const deadline=performance.now()+30000;while(!check()){if(performance.now()>deadline)throw Error('Mud lifecycle timeout');await new Promise(requestAnimationFrame);}};
 const pending=prepareTerrainChunk(world,data,()=>true,{scheduler:world.frameScheduler,signal:owner.signal});
 try{
  await until(()=>!!held);
  if(!executor.active||executor.jobs.size!==1||world.frameScheduler.snapshot().waiting<1)throw Error('Real request not suspended');
  const suspended={id:executor.active.id,waiting:world.frameScheduler.snapshot().waiting,pending:executor.jobs.size};
  if(mode==='failure')executor.fail(Error('QA injected worker transport failure'));
  else if(mode==='quality')world.qualitySetting(world.quality==='media'?'baja':'media');
  else await globalThis.qaReturnToMenu();
  let done=false;pending.then(value=>{result=value;done=true;},error=>{result=error;done=true;});await until(()=>done);
  if(result instanceof Error)throw result;
  if(mode==='failure'){
   if(!result?.preparedGroup)throw Error('Fallback did not prepare a complete chunk');
   const actual=result.preparedGroup.children.find(m=>m.name==='mangrove-mud-patches'),expected=group.children.find(m=>m.name==='mangrove-mud-patches');
   for(const name of ['color','normal','qaMudEdge']){const a=actual.geometry.attributes[name].array,b=expected.geometry.attributes[name].array;if(a.length!==b.length||a.some((v,i)=>!Object.is(v,b[i])))throw Error('Fallback changed '+name);}
   discardPreparedTerrain(world,result);result=null;
  }else if(result!==null||disposedPrivate!==1)throw Error('Stale private geometry survived');
  executor.receive=previousReceive;previousReceive.call(executor,held);
  if(mode==='quality')await world.streamingProgramRefresh;
  if(mode!=='exit'&&(world.state.elapsed!==beforeElapsed||[...world.chunks.keys()].sort().join('|')!==beforeKeys))throw Error('Fault changed authoritative/resident world');
  if(mode==='exit'&&(!world.disposed||!executor.closed||!document.querySelector('#native-menu')))throw Error('Exit did not close worker/world');
  if(executor.jobs.size||executor.active||world.frameScheduler.snapshot().waiting)throw Error('Fault left pending work');
  return {mode,suspended,disposedPrivate,worker:{...executor.stats,closed:executor.closed,pending:executor.jobs.size},scheduler:world.frameScheduler.snapshot(),fallbackByteEquivalent:mode==='failure',staleResultDiscarded:mode!=='failure',scope:'Correctness only. A real completed worker message is withheld before receipt; not a performance test or proof of cancellation during CPU execution.'};
 }finally{owner.abort();executor.receive=previousReceive;world.disposePreparedTerrain=previousDispose;if(result?.preparedGroup)discardPreparedTerrain(world,result);if(held)previousReceive.call(executor,held);await pending.catch(()=>{});}
}
