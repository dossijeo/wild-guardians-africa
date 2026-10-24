export async function verifyGameQualityCycle(w){
 const lease=w.programLease;if(!lease?.stats.retained)throw Error('Expected default retention');
 const snapshot=()=>JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,structures:w.state.structures,native:w.spatialSession.core.snapshot()});
 const before=snapshot(),rows=[];
 for(const quality of ['media','baja','media','baja']){
  w.qualitySetting(quality);
  for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);
  w.render(0);await w.whenChunksReady();
  if(w.programLease!==null)throw Error('Quality change retained stale programs');
  const gl=w.renderer.getContext();if(gl.getError()!==gl.NO_ERROR)throw Error('GL error after quality change');
  rows.push({quality,programs:w.renderer.info.programs.length,drawCalls:w.renderer.info.render.calls});
  if(!rows.at(-1).drawCalls)throw Error('Missing draw after quality change');
 }
 if(snapshot()!==before)throw Error('World changed during quality cycle');
 if(lease.stats.released!==lease.stats.retained)throw Error('Initial lease not fully released');
 return {rows,lease:lease.stats,worldUnchanged:true,limitation:'Quality change safely releases the initial program snapshot. Retention is not automatically reacquired until a new world load.'};
}
