import {AWAKENINGS as A} from './awakening-config.js';

// Derived, session-local data. No terrain/nav invalidation and no world scan per tick.
// Sources are static. A new blessing changes total; loading replaces the state.
const indexes=new WeakMap();
const empty=Object.freeze({growth:0,harvestPercent:0,waterTolerance:0,sourceIds:Object.freeze([])});
export function invalidateBlessingInfluence(state){indexes.delete(state);}
export function blessingInfluenceStats(state){return indexes.get(state)?.stats??{builds:0,queries:0,hits:0};}
function indexFor(s){
  let index=indexes.get(s);
  if(index&&index.plants===s.plants&&index.total===(s.awakenings?.total??0))return index;
  const stats=index?.stats??{builds:0,queries:0,hits:0};stats.builds++;
  index={plants:s.plants,total:s.awakenings?.total??0,cells:new Map(),targets:new WeakMap(),stats};
  for(const p of s.plants)if(p.alive&&p.blessing){
    const key=`${Math.floor(p.x/A.radius)},${Math.floor(p.z/A.radius)}`;
    const cell=index.cells.get(key)??[];cell.push(p);index.cells.set(key,cell);
  }
  indexes.set(s,index);return index;
}
export function blessingInfluence(s,p){
  if(p.blessing||!p.alive||s.awakenings?.enabled===false)return empty;
  const index=indexFor(s);index.stats.queries++;
  if(!index.cells.size)return empty;
  const cached=index.targets.get(p);
  if(cached){index.stats.hits++;return cached;}
  const sources=[],x=Math.floor(p.x/A.radius),z=Math.floor(p.z/A.radius);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
    for(const source of index.cells.get(`${x+dx},${z+dz}`)??[])
      if(source.alive&&source.blessing&&Math.hypot(source.x-p.x,source.z-p.z)<=A.radius+1e-9)sources.push(source);
  sources.sort((a,b)=>a.id.localeCompare(b.id));
  // 20%, +10%, +5%, then no further economic or growth increase.
  const percent=Math.min(A.overlapCap*100,sources.reduce((n,_,i)=>n+A.harvest*100/2**i,0));
  const value=sources.length?Object.freeze({growth:percent/100,harvestPercent:percent,
    waterTolerance:A.waterTolerance,sourceIds:Object.freeze(sources.map(p=>p.id))}):empty;
  index.targets.set(p,value);return value;
}
