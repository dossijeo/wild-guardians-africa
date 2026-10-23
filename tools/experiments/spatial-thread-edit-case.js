export async function verifyConcurrentWallEdit(w){
 const url=performance.getEntriesByType('resource').map(r=>r.name).find(u=>/\/src\/simulation\/game\.js(?:\?|$)/.test(u));
 const game=await import(url),s=w.state,core=w.spatialSession.core,p=core.preparation;
 if(!p)throw Error('Expected pthread runtime');
 game.pause(s,'menu');await w.whenChunksReady();
 const center=s.structures.find(item=>item.kind==='center');if(!center)throw Error('Missing center');
 let candidate;
 for(let radius=8;radius<=16&&!candidate;radius+=4)for(let i=0;i<16&&!candidate;i++){
  const item={kind:'wall',material:'empalizada',gate:false,x:center.x+Math.cos(i*Math.PI/8)*radius,z:center.z+Math.sin(i*Math.PI/8)*radius,yaw:0};
  if(w.nav.wallPlacement(item).valid)candidate=item;
 }
 if(!candidate)throw Error('No legal wall site');
 const initialBarriers=core.snapshot().barriers.length,events=[],publications=[];
 const originalStart=p.start,originalPublish=p.publish,originalCamera=w.updateCamera;
 let action=null,wall,editError=null;
 w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
 p.start=function(...args){
  const id=originalStart.apply(this,args);
  if(id>0&&action){const command=action;action=null;
   void (async()=>{
    const deadline=performance.now()+10000;
    while(p.status()===1){if(performance.now()>deadline)throw Error('Worker start timeout');await new Promise(resolve=>setTimeout(resolve,0));}
    const status=p.status();if(status!==2)throw Error('Edit did not overlap running native generation');
    game.resume(s,'menu');try{command();w.spatialSession.syncState(s);}finally{game.pause(s,'menu');}
    events.push({id,status,cx:args[0],cz:args[1],barriers:core.snapshot().barriers.length});
   })().catch(error=>{editError=error;});
  }
  return id;
 };
 p.publish=function(...args){const result=originalPublish.apply(this,args);publications.push({id:args[0],result});return result;};
 const travel=async(command)=>{
  action=command;w.controls.target.x+=48;w.camera.position.x+=48;
  const deadline=performance.now()+30000;
  do{if(performance.now()>deadline)throw Error('Concurrent edit stream timeout');await new Promise(requestAnimationFrame);}
  while(action||w.chunkStream.summary().busy||w.chunkStream.summary().queued);
  if(editError)throw editError;
  if(s.pauses.includes('runtime-error'))throw Error('Runtime failure during edit');
 };
 try{
  await travel(()=>{
   const before=s.structures.length;
   if(game.placeStructure(s,'qa-pthread-wall-build',candidate,w.nav)===false||s.structures.length!==before+1)throw Error('Wall command rejected');
   wall=s.structures.at(-1);
  });
  if(core.snapshot().barriers.length!==initialBarriers+1)throw Error('Wall topology lost after publication');
  if(!w.objects.has(wall.id))throw Error('Built wall not rendered');
  const built={wallId:wall.id,barriers:core.snapshot().barriers.length,rendered:true};
  await travel(()=>{if(game.removeWall(s,'qa-pthread-wall-remove',wall.id,w.nav)===false)throw Error('Remove command rejected');});
  if(core.snapshot().barriers.length!==initialBarriers)throw Error('Removed wall restored by stale publication');
  if(events.length!==2||!events.every(event=>publications.some(row=>row.id===event.id&&row.result===-2)))throw Error('Missing stale result rejection');
  return {scope:'Real legal build/remove commands overlapping confirmed running native generation, production session mirror, paused between commands; not a raid or active actor-route stress test',initialBarriers,built,finalBarriers:core.snapshot().barriers.length,events,publications,stream:w.chunkStream.summary()};
 }finally{action=null;p.start=originalStart;p.publish=originalPublish;w.updateCamera=originalCamera;}
}
