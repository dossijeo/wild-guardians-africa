// Native generation is already complete. Only GPU-facing object construction
// is scheduled here; no incomplete group is attached to the scene.
export async function prepareTerrainChunk(world,data,current,{budgetMs=4,yieldWork=()=>new Promise(r=>setTimeout(r,0)),now=()=>performance.now()}={}){
  const steps=world.prepareTerrainSteps(data.cx,data.cz,data);
  const quality=world.quality;
  let completed=false;const began=now();let cpuMs=0;
  try{
    let started=now();
    while(current()&&!world.disposed&&world.quality===quality){
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
