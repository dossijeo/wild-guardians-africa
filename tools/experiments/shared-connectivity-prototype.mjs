// QA-only shared animal connectivity. One exact discrete component answers
// reachability for all animals connected to it, all crop groups and all their
// service points. The bounds contain every native 32-cell A* corridor in the
// current raid. Native direct fractional segments remain an explicit escape.
import {activeCrops} from '../../src/simulation/active-crops.js';
import {logicalAnimalGrid} from './logical-animal-grid-prototype.mjs';
import {breachPortalTable} from './breach-portal-prototype.mjs';

const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const key=(x,z)=>`${x},${z}`;
const inside=(b,x,z)=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ;
const nativeMargin=40;

export function installSharedConnectivity(nav,metrics={}){
  Object.assign(metrics,{components:0,reused:0,visited:0,componentMilliseconds:0,queries:0,positive:0,negative:0,direct:0,uncertain:0,groupSkips:0,portalLinks:0,portalBuildMilliseconds:0,grid:{}});
  const originalReach=nav.approachReachability.bind(nav),originalGroup=nav.approachGroupBlocked.bind(nav);
  let version=null,grid=null,bounds=null,portals=null,byRadius=new Map();
  const prepare=()=>{
    if(version===nav.version)return;
    version=nav.version;metrics.grid={};grid=logicalAnimalGrid(nav,metrics.grid);byRadius=new Map();
    portals=breachPortalTable(nav);metrics.portalBuildMilliseconds+=portals.buildMilliseconds;
    const objects=[...activeCrops(nav.state?.plants),...(nav.state?.structures??[]),...(nav.state?.raid?.animals??[])];
    if(!objects.length){bounds=null;return;}
    bounds={minX:Math.floor(Math.min(...objects.map(o=>o.x)))-nativeMargin,maxX:Math.ceil(Math.max(...objects.map(o=>o.x)))+nativeMargin,
      minZ:Math.floor(Math.min(...objects.map(o=>o.z)))-nativeMargin,maxZ:Math.ceil(Math.max(...objects.map(o=>o.z)))+nativeMargin};
    if((bounds.maxX-bounds.minX+1)*(bounds.maxZ-bounds.minZ+1)>250000)bounds=null;
  };
  function radiusIndex(radius){
    let index=byRadius.get(radius);if(index)return index;
    const links=new Map();
    for(const portal of portals.portals)for(const entry of Object.values(portal.bySpecies)){
      if(entry.radius!==radius||entry.status!=='passable')continue;
      for(const crossing of entry.crossings){
        const a={x:Math.round(crossing.from.x),z:Math.round(crossing.from.z)};
        const b={x:Math.round(crossing.to.x),z:Math.round(crossing.to.z)};
        if(!inside(bounds,a.x,a.z)||!inside(bounds,b.x,b.z)||!grid.walkable(a.x,a.z,radius)||!grid.walkable(b.x,b.z,radius)||
          !nav.segmentClear(a,crossing.from,radius,null,false)||!nav.segmentClear(crossing.to,b,radius,null,false))continue;
        for(const [from,to] of [[a,b],[b,a]]){
          const k=key(from.x,from.z);if(!links.has(k))links.set(k,[]);links.get(k).push(to);metrics.portalLinks++;
        }
      }
    }
    index={members:new Map(),components:[],links};byRadius.set(radius,index);return index;
  }
  function actorSeeds(actor,radius){
    const points=[],sx=Math.round(actor.x),sz=Math.round(actor.z);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=sx+dx,z=sz+dz;
      if(inside(bounds,x,z)&&grid.walkable(x,z,radius)&&nav.segmentClear(actor,{x,z},radius,null,false))points.push({x,z});
    }
    return points;
  }
  function component(actor,radius){
    prepare();if(!bounds)return null;
    const index=radiusIndex(radius),seeds=actorSeeds(actor,radius);
    if(!seeds.length)return null;
    const previous=new Set(seeds.map(p=>index.members.get(key(p.x,p.z))).filter(Boolean));
    if(previous.size===1&&seeds.every(p=>index.members.has(key(p.x,p.z)))){
      metrics.reused++;return [...previous][0];
    }
    if(previous.size>1)return null; // fractional actor connector joins grid components; native fallback
    const started=performance.now(),cells=new Set(),queue=[];
    for(const point of seeds){const k=key(point.x,point.z);if(!cells.has(k)){cells.add(k);queue.push(point);}}
    let exhausted=false;
    for(let i=0;i<queue.length;i++){
      if(i>=120000){exhausted=true;break;}
      const p=queue[i];
      for(let d=0;d<8;d++){
        const [dx,dz]=dirs[d],x=p.x+dx,z=p.z+dz,k=key(x,z);
        if(!inside(bounds,x,z)||cells.has(k)||!grid.walkable(x,z,radius)||!grid.step(p.x,p.z,x,z,radius,d))continue;
        cells.add(k);queue.push({x,z});
      }
      for(const to of index.links.get(key(p.x,p.z))??[]){
        const k=key(to.x,to.z);if(!cells.has(k)){cells.add(k);queue.push(to);}
      }
    }
    metrics.components++;metrics.visited+=queue.length;metrics.componentMilliseconds+=performance.now()-started;
    if(exhausted)return null;
    const result={cells};index.components.push(result);
    for(const k of cells)index.members.set(k,result);
    return result;
  }
  function reachable(actor,radius,point,region,cache){
    metrics.queries++;
    const k=`${point.x},${point.z}`;if(cache.has(k))return cache.get(k);
    if(nav.segmentClear(actor,point,radius,null,false)){metrics.direct++;cache.set(k,true);return true;}
    const ex=Math.round(point.x),ez=Math.round(point.z);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=ex+dx,z=ez+dz;
      if(region.cells.has(key(x,z))&&nav.segmentClear({x,z},point,radius,null,false)){
        metrics.positive++;cache.set(k,true);return true;
      }
    }
    metrics.negative++;cache.set(k,false);return false;
  }
  nav.approachReachability=(actor,targets,radius,margin=32)=>{
    const region=component(actor,radius);
    if(!region){metrics.uncertain++;return originalReach(actor,targets,radius,margin);}
    const cache=new Map();return point=>reachable(actor,radius,point,region,cache);
  };
  nav.approachGroupBlocked=(actor,targets,radius,reach)=>{
    const region=component(actor,radius);
    if(!region){metrics.uncertain++;return originalGroup(actor,targets,radius,reach);}
    const cache=new Map();
    for(const target of targets)for(let j=0;j<32;j++){
      const angle=j*Math.PI/16,point={x:target.x+Math.sin(angle)*reach,z:target.z+Math.cos(angle)*reach};
      if(reachable(actor,radius,point,region,cache))return false;
    }
    metrics.groupSkips++;return true;
  };
  return metrics;
}
