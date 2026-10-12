// Diagnostic only: conservative grid reachability from a retained raid entry.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';

const [checkpoint,entryReport,output]=process.argv.slice(2);
if(!checkpoint||!entryReport||!output)throw Error('Usage: node tools/probe-raid-crop-reachability.mjs checkpoint.gz entry-report.json output.json');
const state=deserialize(gunzipSync(readFileSync(checkpoint)).toString());
const {nav}=createOpeningWorld({seed:state.seed,biome:state.biome,culture:state.culture,terrainVersion:state.terrainVersion});
nav.setState(state);
const actors=JSON.parse(readFileSync(entryReport,'utf8')).raidActors;
const crops=state.plants.filter(p=>p.alive);
const key=(x,z)=>`${x},${z}`,margin=32;
const steps=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const results=[];
for(const actor of [actors[0],actors[8]]){
 const start=actor.spawn,r=ANIMAL_ACTIONS.animals[actor.species].presentation.footprint.radius,sx=Math.round(start.x),sz=Math.round(start.z);
 const bounds=[Math.floor(Math.min(sx,...crops.map(p=>p.x))-margin),Math.floor(Math.min(sz,...crops.map(p=>p.z))-margin),Math.ceil(Math.max(sx,...crops.map(p=>p.x))+margin),Math.ceil(Math.max(sz,...crops.map(p=>p.z))+margin)];
 const inside=(x,z)=>x>=bounds[0]&&x<=bounds[2]&&z>=bounds[1]&&z<=bounds[3];
 const seen=new Set(),queue=[];
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const x=sx+dx,z=sz+dz;
  if(inside(x,z)&&nav.walkable(x,z,r,null,false)&&nav.segmentClear(start,{x,z},r,null,false)){seen.add(key(x,z));queue.push({x,z});}
 }
 for(let head=0;head<queue.length;head++){
  const p=queue[head];
  for(const [dx,dz] of steps){const x=p.x+dx,z=p.z+dz,k=key(x,z);
   if(!inside(x,z)||seen.has(k)||!nav.walkable(x,z,r,null,false)||dx&&dz&&(!nav.walkable(p.x+dx,p.z,r,null,false)||!nav.walkable(p.x,p.z+dz,r,null,false))||!nav.segmentClear(p,{x,z},r,null,false))continue;
   seen.add(k);queue.push({x,z});
  }
 }
 const nearby=crops.filter(crop=>{for(let z=Math.floor(crop.z-3);z<=Math.ceil(crop.z+3);z++)for(let x=Math.floor(crop.x-3);x<=Math.ceil(crop.x+3);x++)if(seen.has(key(x,z)))return true;return false;});
 const reachableTargets=[];
 for(const crop of crops){const angle=Math.atan2(start.x-crop.x,start.z-crop.z),reach=.6+r;
  let reachable=false;
  for(let sample=0;sample<32&&!reachable;sample++){
   const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/16;
   const point={x:crop.x+Math.sin(angle+offset)*reach,z:crop.z+Math.cos(angle+offset)*reach};
   if(!nav.walkable(point.x,point.z,r,null,false))continue;
   if(nav.segmentClear(start,point,r,null,false)){reachable=true;break;}
   for(let z=Math.floor(point.z-3);z<=Math.ceil(point.z+3)&&!reachable;z++)for(let x=Math.floor(point.x-3);x<=Math.ceil(point.x+3);x++)if(seen.has(key(x,z))&&Math.hypot(x-point.x,z-point.z)<3&&nav.segmentClear({x,z},point,r,null,false)){reachable=true;break;}
  }
  if(reachable)reachableTargets.push(crop.id);
 }
 results.push({actor:actor.species,radius:r,start,bounds,visited:seen.size,cropsWithReachableGridWithin3m:nearby.length,cropsWithPlausibleNativeApproach:reachableTargets.length,approachExamples:reachableTargets.slice(0,8)});
}
writeFileSync(output,JSON.stringify({scope:'Diagnostic grid reachability only; not a replacement for native path, collision or campaign validation',results},null,2)+'\n');
console.log(JSON.stringify(results));
