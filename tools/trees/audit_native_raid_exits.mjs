import fs from 'node:fs';
import {spawnRaid} from '../../src/simulation/raids.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

const binary=process.env.DYNAMIC_BODY_CANDIDATE,captureFile=process.env.DYNAMIC_REPLAY_CAPTURE;if(!binary||!captureFile)throw Error('Set DYNAMIC_BODY_CANDIDATE and DYNAMIC_REPLAY_CAPTURE');
const capture=JSON.parse(fs.readFileSync(captureFile,'utf8')),module=new WebAssembly.Module(fs.readFileSync(binary)),rows=[];
for(const group of [['warthog','warthog'],['lion','lion'],['warthog','lion'],['warthog','warthog','warthog']]){
 const state=structuredClone(capture.state);state.raid=null;state.postgame=false;if(process.env.REMOVE_WALLS==='1')state.structures=state.structures.filter(s=>s.kind!=='wall');const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48);for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const nav=createSpatialNavigationMovement(session,state),spawned=spawnRaid(state,{group},nav),animals=state.raid?.animals??[],routes=[];
  if(spawned&&process.env.ROUTE_PROBE==='1')for(const animal of animals){let from=null;for(const back of [18,14,10,6]){const dx=v.x-animal.spawn.x,dz=v.z-animal.spawn.z,len=Math.hypot(dx,dz),point={x:animal.spawn.x+dx/len*back,z:animal.spawn.z+dz/len*back};if(nav.walkable(point.x,point.z,animal.radius,null,false)){from=point;break;}}const route=from?session.routeActorNative(from,animal.exit,{worker:false,species:animal.species}):{status:'no-origin',points:[]};routes.push({id:animal.id,species:animal.species,from,exit:animal.exit,status:route.status,points:route.points});}
  const pairs=[];if(process.env.ROUTE_PROBE==='1')for(let i=0;i<routes.length;i++)for(let j=i+1;j<routes.length;j++){const edges=r=>{const p=[r.from,...r.points];return p.slice(1).map((point,k)=>JSON.stringify([p[k],point]));},other=new Set(edges(routes[j]));pairs.push({first:routes[i].id,second:routes[j].id,sameSpecies:routes[i].species===routes[j].species,identicalDirectedSegments:edges(routes[i]).filter(edge=>other.has(edge)).length});}
  rows.push({group,spawned:!!spawned,entryFailure:nav.raidEntryFailure??null,animals:animals.map(a=>({id:a.id,species:a.species,spawn:a.spawn,exit:a.exit,radius:a.radius})),...(process.env.ROUTE_PROBE==='1'?{routes,pairs}: {})});
 }finally{session.dispose();}
}
const result={scope:'Normal spawnRaid formation from one saved savanna state, 5x5 native chunks, selected groups; no movement, timing or GPU.',wallsRemoved:process.env.REMOVE_WALLS==='1',rows};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
