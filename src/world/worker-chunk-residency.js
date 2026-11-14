// Demand for already generated native data, independent of graphical radius.
// No route planning, generation, gameplay bounds or worker state is changed here.
export function workerChunkDemand(state){
  const keys=new Set(),villages=new Map((state.villages??[]).map(v=>[v.id,v]));
  const centers=new Map((state.structures??[]).filter(s=>s.kind==='center').map(s=>[s.id,s]));
  const valid=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z);
  const point=p=>{
    if(!valid(p))return;
    // Cover local connectors and collision queries on both sides of a seam.
    for(let z=Math.floor((p.z-2+24)/48);z<=Math.floor((p.z+2+24)/48);z++)
      for(let x=Math.floor((p.x-2+24)/48);x<=Math.floor((p.x+2+24)/48);x++)keys.add(`${x},${z}`);
  };
  const segment=(a,b)=>{
    if(!valid(a)||!valid(b))return;
    point(a);point(b);
    // Visit each grid crossing, including corner-touching chunks, without
    // retaining the entire rectangle around a long diagonal route.
    for(const axis of ['x','z']){
      const delta=b[axis]-a[axis];if(!delta)continue;
      const lo=Math.min(a[axis],b[axis]),hi=Math.max(a[axis],b[axis]);
      for(let edge=(Math.floor((lo+24)/48)+1)*48-24;edge<hi;edge+=48){
        const t=(edge-a[axis])/delta;
        point({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
      }
    }
  };
  for(const worker of state.workers??[]){
    const village=villages.get(worker.villageId),home=village?.entry??village;
    point(worker);point(home);point(centers.get(worker.centerId));
    point(worker.taskApproach?.destination);point(worker.deliveryApproach?.destination);
    let previous=worker;
    for(const next of worker.path??[]){segment(previous,next);previous=next;}
  }
  return keys;
}
