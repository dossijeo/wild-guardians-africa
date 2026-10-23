export async function verifyGameContextRestore(w){
 const lease=w.programLease;if(!lease?.stats.retained)throw Error('Expected retained programs');
 const renderer=w.renderer,canvas=w.canvas,core=w.spatialSession.core;
 const snapshot=()=>JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,structures:w.state.structures,native:core.snapshot(),chunks:[...w.chunks.keys()].sort()});
 const before=snapshot(),oldPrograms=renderer.info.programs;
 const event=name=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(name+' timeout')),30000);canvas.addEventListener(name,()=>{clearTimeout(timer);resolve();},{once:true});});
 const lost=event('webglcontextlost');renderer.forceContextLoss();await lost;
 if(w.programLease!==null||lease.stats.abandoned!==lease.stats.retained)throw Error('Old lease not abandoned');
 await new Promise(r=>setTimeout(r,150));const restored=event('webglcontextrestored');renderer.forceContextRestore();await restored;
 if(renderer.info.programs===oldPrograms)throw Error('Renderer program collection unchanged');
 for(let i=0;i<30;i++)await new Promise(requestAnimationFrame);
 await w.whenChunksReady();w.render(0);
 if(snapshot()!==before)throw Error('World changed across context restoration');
 if(w.state.pauses.includes('context-lost')||w.state.pauses.includes('runtime-error'))throw Error('Recovery left failure pause');
 const gl=renderer.getContext();if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw Error('GL did not recover cleanly');
 const programs=renderer.info.programs.length;if(!programs||renderer.info.render.calls<=0)throw Error('No restored draw');
 return {abandoned:lease.stats,programs,drawCalls:renderer.info.render.calls,worldUnchanged:true,backend:w.spatialSession.runtime.backend,nativeBytes:core.metrics().memoryBytes,glEpoch:w.glResourceEpoch?.stats};
}
