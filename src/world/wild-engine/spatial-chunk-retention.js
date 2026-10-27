// Retention only: never generates chunks or changes navigation. The caller owns
// demand and must keep query metadata consistent if graphical chunks disappear.
export function createSpatialChunkRetention(core,{loaded,desired,onRetain=()=>{},onRelease=()=>{}}){
  let demand=new Set(),disposed=false;
  const deferred=new Map();
  const keyOf=(cx,cz)=>`${cx},${cz}`;
  const keep=(cx,cz)=>{
    const key=keyOf(cx,cz);
    if(!disposed&&demand.has(key)){deferred.set(key,[cx,cz]);onRetain(cx,cz);return true;}
    deferred.delete(key);return false;
  };
  function releaseChunk(cx,cz){
    if(keep(cx,cz))return 0;
    const count=core.removeChunk(cx,cz);onRelease(cx,cz);return count;
  }
  function removeBatch(coordinates){
    if(!coordinates.length)return 0;
    const count=core.removeChunks(coordinates);
    for(const [cx,cz] of coordinates)onRelease(cx,cz);
    return count;
  }
  function releaseChunks(coordinates){
    if(!Array.isArray(coordinates)||coordinates.length>4096||coordinates.some(p=>
      !Array.isArray(p)||p.length!==2||p.some(n=>!Number.isInteger(n)||n<-2147483648||n>2147483647)))
      throw TypeError('Invalid chunk removal batch');
    const removable=coordinates.filter(([cx,cz])=>!keep(cx,cz));
    return removeBatch(removable);
  }
  function reconcile(){
    const removable=[];
    for(const [key,coordinates] of deferred){
      if(demand.has(key))continue;
      deferred.delete(key);
      // A chunk can return to graphical ownership while its native lease ends.
      if(!loaded().has(key)&&!desired().has(key))removable.push(coordinates);
    }
    return removeBatch(removable);
  }
  return {
    releaseChunk,releaseChunks,
    setDemand(keys){
      if(disposed)throw Error('Spatial retention is disposed');
      const next=new Set(keys);
      for(const key of next)if(typeof key!=='string'||!/^(-?\d+),(-?\d+)$/.test(key)||
        key.split(',').some(v=>!Number.isInteger(Number(v))||Number(v)<-2147483648||Number(v)>2147483647)||
        key.split(',').map(Number).join(',')!==key)
        throw TypeError('Expected signed 32-bit chunk keys');
      demand=next;return reconcile();
    },
    keys:()=>deferred.keys(),
    summary:()=>({demand:demand.size,retained:deferred.size}),
    dispose(){if(disposed)return;disposed=true;demand.clear();reconcile();},
  };
}
