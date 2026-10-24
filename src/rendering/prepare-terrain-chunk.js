const phaseCosts=new WeakMap();
// Native generation is already complete. Only GPU-facing object construction
// is scheduled here; no incomplete group is attached to the scene.
export async function prepareTerrainChunk(world,data,current,{scheduler=null,signal,budgetMs=4,yieldWork=()=>new Promise(r=>setTimeout(r,0)),now=()=>performance.now()}={}){
  const steps=world.prepareTerrainSteps(data.cx,data.cz,data,{asynchronous:!!scheduler});
  const quality=world.quality,epoch=world.glResourceEpoch?.stats.epoch,revision=world.streamingProgramRevision;
  const valid=()=>current()&&!world.disposed&&world.quality===quality&&world.glResourceEpoch?.stats.epoch===epoch&&world.streamingProgramRevision===revision;
  let completed=false;const began=now();let cpuMs=0;
  try{
    if(scheduler){
      let phase='setup',lastFinished=began;
      if(!phaseCosts.has(world))phaseCosts.set(world,new Map());
      const costs=phaseCosts.get(world),costKey=()=>quality+':'+phase;
      const measured={
        next(value){const completedPhase=phase,start=now();const step=steps.next(value);const finished=now(),ms=finished-start,waitMs=start-lastFinished;lastFinished=finished;cpuMs+=ms;costs.set(costKey(),Math.max(ms,(costs.get(costKey())??0)*.9));phase=step.value?.label??step.value;world.onTerrainPreparationSlice?.({cx:data.cx,cz:data.cz,phase:completedPhase,ms,waitMs,done:step.done});return step;},
        return(){return steps.return();}
      };
      // These chunks are already demanded by streaming, not speculative prefetch.
      // Let deadline admission use bounded CPU debt immediately; a fresh 250 ms
      // grace period on every completed native job delayed even trivial setup.
      const result=await scheduler.submit(measured,{valid,signal,label:()=>`terrain ${data.cx},${data.cz}:${phase}`,estimate:()=>costs.get(costKey())??.25,priority:10,deadline:now()});
      if(result){completed=true;world.onTerrainPreparationDone?.({cx:data.cx,cz:data.cz,cpuMs,elapsedMs:now()-began});return {...data,preparedGroup:result};}
      return null;
    }
    let started=now();
    while(valid()){
      const step=steps.next();
      const sliceMs=now()-started;
      if(step.done||sliceMs>=budgetMs){
        cpuMs+=sliceMs;world.onTerrainPreparationSlice?.({cx:data.cx,cz:data.cz,ms:sliceMs,done:step.done});
        if(step.done){completed=true;world.onTerrainPreparationDone?.({cx:data.cx,cz:data.cz,cpuMs,elapsedMs:now()-began});return {...data,preparedGroup:step.value};}
        await yieldWork();started=now();
      }
    }
    return null;
  }finally{if(!completed)steps.return();}
}
export function discardPreparedTerrain(world,data){
  if(data?.preparedGroup){world.disposePreparedTerrain(data.preparedGroup);delete data.preparedGroup;}
}
