import {createProgramRetentionScope} from '/src/rendering/retain-warmed-programs.js';
import {compileLoadingProgramsBatched} from '/src/rendering/loading-programs.js';
export async function verifyGameContextRestore(w){
 const lease=w.programLease;if(!lease?.stats.retained)throw Error('Expected retained programs');
 const renderer=w.renderer,canvas=w.canvas,core=w.spatialSession.core;
 const snapshot=()=>JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,structures:w.state.structures,native:core.snapshot(),chunks:[...w.chunks.keys()].sort()});
 const before=snapshot(),oldPrograms=renderer.info.programs;
 const event=name=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(name+' timeout')),30000);canvas.addEventListener(name,()=>{clearTimeout(timer);resolve();},{once:true});});
 const temporaryScope=new URLSearchParams(location.search).get('qualityPinPrograms')==='1'?createProgramRetentionScope(renderer):null;
 let interruptedCompilation=null;
 if(new URLSearchParams(location.search).get('contextPrewarm')==='1'){
  let enter;const entered=new Promise(r=>enter=r);
  const pending=compileLoadingProgramsBatched(renderer,w.scene,w.camera,w.scene,{screen:true,guardResourceDisposal:true,onSubmit:temporaryScope?span=>{if(span.label==='loading-compile-submit')temporaryScope.acquire();}:undefined,cancelled:()=>w.disposed,batchSize:1,nextFrame:()=>{enter();return new Promise(()=>{});}});
  interruptedCompilation=pending.then(()=>({resolved:true}),error=>({resolved:false,message:error.message})).finally(()=>temporaryScope?.dispose());
  await Promise.race([entered,interruptedCompilation.then(()=>{throw Error('Compilation ended before suspended frame');})]);
 }
 const lost=event('webglcontextlost');renderer.forceContextLoss();await lost;
 const compilationCancellation=interruptedCompilation?await interruptedCompilation:null;
 if(compilationCancellation?.resolved)throw Error('Lost-context compilation resolved');
 if(w.programLease!==null||lease.stats.abandoned!==lease.stats.retained)throw Error('Old lease not abandoned');
 await new Promise(r=>setTimeout(r,150));const restored=event('webglcontextrestored');renderer.forceContextRestore();await restored;
 if(renderer.info.programs===oldPrograms)throw Error('Renderer program collection unchanged');
 for(let i=0;i<30;i++)await new Promise(requestAnimationFrame);
 await w.whenChunksReady();w.render(0);await w.streamingProgramRefresh;
 if(!w.programLease?.stats.retained)throw Error('Context restoration did not reacquire retention');
 if(snapshot()!==before)throw Error('World changed across context restoration');
 if(w.state.pauses.includes('context-lost')||w.state.pauses.includes('runtime-error'))throw Error('Recovery left failure pause');
 const gl=renderer.getContext();if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw Error('GL did not recover cleanly');
 const programs=renderer.info.programs.length;if(!programs||renderer.info.render.calls<=0)throw Error('No restored draw');
 return {temporaryProgramScope:temporaryScope?.stats??null,compilationCancellation,recovery:w.streamingProgramRecovery,retained:w.programLease.stats,abandoned:lease.stats,programs,drawCalls:renderer.info.render.calls,worldUnchanged:true,backend:w.spatialSession.runtime.backend,nativeBytes:core.metrics().memoryBytes,glEpoch:w.glResourceEpoch?.stats};
}
