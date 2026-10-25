export async function verifyLiveCache(w,{frames=300,requireCache=true}={}){
 if(!Number.isInteger(frames)||frames<1||frames>18000)throw Error("Invalid live probe frame count");
 const url=performance.getEntriesByType('resource').map(r=>r.name).find(u=>/\/src\/simulation\/game\.js(?:\?|$)/.test(u));const game=await import(url),c=w.mangroveMaterialCache;
 if((requireCache&&!c)||w.state.pauses.some(p=>p!=='menu'))throw Error('Unexpected live probe precondition');
 const snapshot=()=>({elapsed:w.state.elapsed,time:w.state.time,workers:w.state.workers.map(x=>({id:x.id,x:x.x,z:x.z,task:x.task})),entries:c?.queue.entries.size??0,bytes:c?.queue.stats.bytes??0,publications:c?.queue.stats.published??0,memory:{...w.renderer.info.memory},pauses:[...w.state.pauses]});
 const before=snapshot(),samples=[],started=performance.now();game.resume(w.state,'menu');
 try{for(let i=0;i<frames;i++){await new Promise(requestAnimationFrame);if(i%30===0)samples.push(snapshot());}
 const after=snapshot();if(after.elapsed<=before.elapsed)throw Error('Simulation did not advance');if((c?.queue.stats.peakBytes??0)>40*1024*1024||w.renderer.getContext().getError())throw Error('Live cache resource/GL failure');
 return {frames,wallMs:performance.now()-started,before,after,samples,peakBytes:c?.queue.stats.peakBytes??0,capture:w.renderer.domElement.toDataURL('image/png').split(',')[1],scope:'Live-world stability probe, not campaign completion or performance benchmark'};
 }finally{game.pause(w.state,'menu');}
}
