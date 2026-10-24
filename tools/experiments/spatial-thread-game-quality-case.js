export async function verifyGameQualityCycle(w){
 const lease=w.programLease;if(!lease?.stats.retained)throw Error('Expected default retention');
 const snapshot=()=>JSON.stringify({elapsed:w.state.elapsed,plants:w.state.plants,structures:w.state.structures,native:w.spatialSession.core.snapshot()});
 const before=snapshot(),rows=[],enabled=new URLSearchParams(location.search).get('streamingRecovery')!=='0';
 for(const quality of ['media','baja','media','baja']){
  const frameTimes=[];let previous=performance.now(),tracking=true;
  const sample=()=>{if(!tracking)return;const now=performance.now();frameTimes.push(now-previous);previous=now;if(tracking)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  const begin=performance.now();w.qualitySetting(quality);const settingMs=performance.now()-begin;
  for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);
  w.render(0);await w.whenChunksReady();
  await w.streamingProgramRefresh;
  tracking=false;
  if(enabled&&!w.programLease?.stats.retained)throw Error('Quality change did not recover retention');
  if(!enabled&&w.programLease!==null)throw Error('Disabled recovery retained programs');
  const gl=w.renderer.getContext();if(gl.getError()!==gl.NO_ERROR)throw Error('GL error after quality change');
  rows.push({quality,programs:w.renderer.info.programs.length,drawCalls:w.renderer.info.render.calls,recovery:w.streamingProgramRecovery,retention:w.programLease?.stats??null,settingMs,transitionMs:performance.now()-begin,frameTimes});
  if(!rows.at(-1).drawCalls)throw Error('Missing draw after quality change');
 }
 if(enabled){const previous=w.programLease;w.qualitySetting('media');await new Promise(requestAnimationFrame);w.qualitySetting('baja');await w.streamingProgramRefresh;if(!w.programLease?.stats.retained||w.quality!=='baja')throw Error('Superseded quality recovery failed');if(previous.stats.released!==previous.stats.retained)throw Error('Rapid-change lease leaked');}
 if(snapshot()!==before)throw Error('World changed during quality cycle');
 if(lease.stats.released!==lease.stats.retained)throw Error('Initial lease not fully released');
 return {rows,lease:lease.stats,worldUnchanged:true,limitation:'The refreshed snapshot remains bounded; it prioritizes newer variants and cannot guarantee every future unseen shader is warm.'};
}
