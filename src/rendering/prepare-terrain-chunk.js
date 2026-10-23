// Native generation is already complete. Only GPU-facing object construction
// is scheduled here; no incomplete group is attached to the scene.
export async function prepareTerrainChunk(world,data,current,{budgetMs=4,yieldWork=()=>new Promise(r=>setTimeout(r,0)),now=()=>performance.now()}={}){
  const steps=world.prepareTerrainSteps(data.cx,data.cz,data);
  const quality=world.quality;
  let completed=false;
  try{
    let started=now();
    while(current()&&!world.disposed&&world.quality===quality){
      const step=steps.next();
      if(step.done){completed=true;return {...data,preparedGroup:step.value};}
      if(now()-started>=budgetMs){await yieldWork();started=now();}
    }
    return null;
  }finally{if(!completed)steps.return();}
}
export function discardPreparedTerrain(world,data){
  if(data?.preparedGroup){world.disposePreparedTerrain(data.preparedGroup);delete data.preparedGroup;}
}
