// QA-only conservative connectivity index. The logical grid is authoritative
// for region discovery; exact geometry is sampled once when a cell/edge enters
// the grid. An incomplete component is UNKNOWN, never a negative route proof.
import {logicalAnimalGrid} from './logical-animal-grid-prototype.mjs';
import {breachPortalTable} from './breach-portal-prototype.mjs';

const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const key=(x,z)=>`${x},${z}`;
const extent=targets=>{
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const t of targets){minX=Math.min(minX,t.x);maxX=Math.max(maxX,t.x);minZ=Math.min(minZ,t.z);maxZ=Math.max(maxZ,t.z);}
  return {minX:Math.floor(minX)-12,maxX:Math.ceil(maxX)+12,minZ:Math.floor(minZ)-12,maxZ:Math.ceil(maxZ)+12};
};

export function installSharedRegionPrototype(nav,metrics={}){
  Object.assign(metrics,{builds:0,reuses:0,closed:0,unknown:0,rejected:0,visited:0,buildMilliseconds:0,portalBuildMilliseconds:0,portalCount:0,grid:{}});
  const previous=nav.approachGroupBlocked?.bind(nav);
  let version=null,groups=new Map(),grid=null,portals=null;
  const reset=()=>{
    if(version===nav.version)return;
    version=nav.version;groups=new Map();
    metrics.grid={};grid=logicalAnimalGrid(nav,metrics.grid);
    portals=breachPortalTable(nav);metrics.portalBuildMilliseconds+=portals.buildMilliseconds;
    metrics.portalCount=portals.portals.length;
  };
  function build(targets,radius,reach){
    const bounds=extent(targets),started=performance.now(),cells=new Set(),queue=[];
    // A crop can straddle a cell boundary. Include all physically connected
    // service-point cells; otherwise an apparent enclosure could be false.
    const seeds=[];
    for(const target of targets){
      let found=false;
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4,p={x:target.x+Math.sin(angle)*reach,z:target.z+Math.cos(angle)*reach};
        const x=Math.round(p.x),z=Math.round(p.z);
        if(grid.walkable(x,z,radius)&&nav.segmentClear({x,z},p,radius,null,false)){seeds.push({x,z});found=true;}
      }
      if(!found)return {status:'unknown',reason:'no-service-seed'};
    }
    for(const point of seeds){const k=key(point.x,point.z);if(!cells.has(k)){cells.add(k);queue.push(point);}}
    let open=false,limit=false;
    for(let i=0;i<queue.length;i++){
      const point=queue[i];
      if(point.x<=bounds.minX||point.x>=bounds.maxX||point.z<=bounds.minZ||point.z>=bounds.maxZ){open=true;break;}
      if(i>=16000){limit=true;break;}
      for(let direction=0;direction<directions.length;direction++){
        const [dx,dz]=directions[direction],x=point.x+dx,z=point.z+dz,k=key(x,z);
        if(cells.has(k)||!grid.walkable(x,z,radius)||!grid.step(point.x,point.z,x,z,radius,direction))continue;
        cells.add(k);queue.push({x,z});
      }
    }
    metrics.visited+=queue.length;metrics.builds++;metrics.buildMilliseconds+=performance.now()-started;
    const status=open||limit?'unknown':'closed';
    metrics[status]++;
    return {status,reason:open?'bounds':limit?'node-limit':null,bounds,cells};
  }
  nav.approachGroupBlocked=(actor,targets,radius,reach)=>{
    if(!targets.length)return false;
    reset();
    const id=targets.map(t=>t.id).sort()[0],cacheKey=`${radius}:${id}:${targets.length}`;
    let region=groups.get(cacheKey);
    if(region)metrics.reuses++;
    else {region=build(targets,radius,reach);groups.set(cacheKey,region);}
    if(region.status!=='closed')return previous?.(actor,targets,radius,reach)??false;
    // A direct actor-to-service connector is valid even if the integer grid
    // represents an unusually narrow pass incorrectly.
    const sx=Math.round(actor.x),sz=Math.round(actor.z);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=sx+dx,z=sz+dz;
      if(region.cells.has(key(x,z))&&nav.segmentClear(actor,{x,z},radius,null,false))return false;
    }
    // A verified breach crossing belonging to this interior component makes
    // it accessible. The width class is computed once per topology/species.
    for(const portal of portals.portals)for(const entry of Object.values(portal.bySpecies)){
      if(entry.radius!==radius||entry.status!=='passable')continue;
      for(const crossing of entry.crossings){
        const a=key(Math.round(crossing.from.x),Math.round(crossing.from.z));
        const b=key(Math.round(crossing.to.x),Math.round(crossing.to.z));
        // A narrow fractional portal might not have any integer grid cell in
        // its throat. Treat every nearby verified crossing as uncertainty.
        if(region.cells.has(a)!==region.cells.has(b)||
          crossing.from.x>=region.bounds.minX&&crossing.from.x<=region.bounds.maxX&&
          crossing.from.z>=region.bounds.minZ&&crossing.from.z<=region.bounds.maxZ)return false;
      }
    }
    for(const target of targets.slice(0,4))if(nav.segmentClear(actor,target,radius,null,false))return false;
    metrics.rejected++;return true;
  };
  return metrics;
}
