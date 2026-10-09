import {simulateIntensiveFarm} from './check_intensive_farm.mjs';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canWaterFrom} from '../src/world/work-points.js';
import {serialize} from '../src/persistence/snapshots.js';
const inspectDetours=process.argv[3]==='--detours';
function inspectWateringAlternatives(worker,plant,nav){
 // Diagnostic queries own every mutable navigation cache. Never replace the
 // worker's task/path or relax the native clearance/height requirements.
 const view=Object.assign(Object.create(nav),{chunks:new Map(nav.chunks),walkCache:new Map(),segmentCache:new Map(),failedPaths:new Set(),closedRegions:new Map(),searchedRegions:[],searchNeighborCache:new Map(),portalGraphs:new Map(),preparedPaths:null,workerRouteCache:new Map(),workerRefinementStats:{checks:0,cacheHits:0,fineSegments:0,finePoints:0,rejected:0}});
 const radius=worker.radius??.28,standOff=(plant.species==='platano'?.65:.45)+radius+.1,angle=Math.atan2(worker.x-plant.x,worker.z-plant.z);
 return [0,1,-1,2,-2,3,-3,4].map(offset=>{
  const yaw=angle+offset*Math.PI/4,point={x:plant.x+Math.sin(yaw)*standOff,z:plant.z+Math.cos(yaw)*standOff};
  if(!canWaterFrom({...point,radius},plant,view)||!view.walkable(point.x,point.z,radius,null,true))return {offset,point,valid:false};
  const path=view.path(worker,point,radius,null,true);if(!path)return {offset,point,valid:false};
  let previous=worker,length=0;for(const step of path){length+=Math.hypot(step.x-previous.x,step.z-previous.z);previous=step;}
  return {offset,point,valid:true,length,path};
 });
}
const directory=process.argv[2];if(!directory)throw Error('Usage: node tools/diagnose_canyon_opening.mjs OUTPUT_DIRECTORY');mkdirSync(directory,{recursive:true});
const routingSource=readFileSync(new URL('../src/world/navigation.js',import.meta.url));
const routingSha256=createHash('sha256').update(routingSource).digest('hex');
for(const [biome,culture] of [['gran-canon','mapungubwe'],['gran-canon','saheliana'],['sabana','mapungubwe']]){
 const phases={},routeSamples=[],seen=new Set();let firstDelivery=null,last=new Map(),detours=0;
 const r=simulateIntensiveFarm({days:1,seed:712,biome,culture,mixed:true,onTick(s,nav){if(s.time>=300)return;
 if(firstDelivery===null&&s.crates.some(c=>c.delivered))firstDelivery=s.time;
 for(const w of s.workers){const row=phases[w.status]??={ticks:0,metres:0,stationary:0};row.ticks++;const p=last.get(w.id);if(p){const d=Math.hypot(w.x-p.x,w.z-p.z);row.metres+=d;if(d<.001)row.stationary++;}last.set(w.id,{x:w.x,z:w.z});
 const key=`${w.id}/${w.taskId}/${w.destinationId}`;if(w.path?.length&&!seen.has(key)){seen.add(key);let a=w,length=0;for(const b of w.path){length+=Math.hypot(a.x-b.x,a.z-b.z);a=b;}const end=w.path.at(-1),direct=Math.hypot(w.x-end.x,w.z-end.z),task=s.tasks.find(t=>t.id===w.taskId),sample={time:s.time,status:w.status,task:task?.kind,length,direct,ratio:direct?length/direct:0,start:{x:w.x,z:w.z},end:{...end}};
 if(inspectDetours&&sample.ratio>1.5&&['initial','water'].includes(task?.kind)&&detours<12){const plant=s.plants.find(p=>p.id===task.targetId);if(plant){detours++;sample.path=w.path.map(p=>({...p}));sample.plant={id:plant.id,x:plant.x,z:plant.z,species:plant.species};sample.alternatives=inspectWateringAlternatives(w,plant,nav);const best=Math.min(...sample.alternatives.filter(a=>a.valid).map(a=>a.length));if(length-best>8){sample.workerId=w.id;sample.snapshot=`${biome}-${culture}-detour-${detours}.json`;writeFileSync(`${directory}/${sample.snapshot}`,serialize(s));}}}
 routeSamples.push(sample);}
 }
 }});const out={biome,culture,routingSha256,buildingShortcutEnabled:routingSource.toString().includes("import {shortenBuildingRoute}"),firstDelivery,phases,routeSamples,daily:r.daily};writeFileSync(`${directory}/${biome}-${culture}.json`,JSON.stringify(out));console.log(JSON.stringify({biome,culture,firstDelivery,phases,routes:routeSamples.length,meanRatio:routeSamples.reduce((n,x)=>n+x.ratio,0)/routeSamples.length}));
}
