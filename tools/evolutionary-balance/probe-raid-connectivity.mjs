// QA-only, offline probe of a captured raid. Never call this on the live game navigation.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {wallCollisionFrame} from '../../src/world/wall-collision-frame.js';

const chunkAt=value=>Math.floor((value+24)/48);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const status=value=>value===true?'accessible':value===false?'blocked':'unknown';

export function probeRaidConnectivity(capture,wasm){
 const state=deserialize(JSON.stringify(capture.state)),bounds=capture.activeBounds;
 if(!state.raid||!Array.isArray(bounds)||bounds.length!==4)throw Error('Expected captured raid and bounds');
 const minX=chunkAt(bounds[0]),maxX=chunkAt(bounds[2]),minZ=chunkAt(bounds[1]),maxZ=chunkAt(bounds[3]);
 if((maxX-minX+1)*(maxZ-minZ+1)>100)throw Error('Raid probe exceeds 100 chunks');
 const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
 });
 try{
  for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);
  const crops=state.plants.filter(p=>p.alive),species=new Map();
  for(const animal of state.raid.animals)if(!species.has(animal.species))species.set(animal.species,animal);
  const queries=[],wallSideWitnesses=[];
  for(const animal of species.values()){
   const wallSides=[];
   for(const wall of state.structures.filter(s=>s.kind==='wall'&&s.status!=='ruined')
     .sort((a,b)=>distance(animal,a)-distance(animal,b))){
    const frame=wallCollisionFrame(wall),offset=frame.depth+animal.radius+.6;
    for(const sign of [1,-1]){
     const point={x:frame.x+Math.sin(frame.yaw)*offset*sign,
      z:frame.z+Math.cos(frame.yaw)*offset*sign};
     const standable=nav.walkable(point.x,point.z,animal.radius,null,false);
     const connectivity=standable?
       status(nav.regionConnected(animal,point,animal.radius,null,false)):null;
     wallSides.push({wallId:wall.id,gate:!!wall.gate,sign,point,
      distance:distance(animal,wall),standable,connectivity,
      enclosure:standable?nav.enclosureFor(point,animal.radius):null});
    }
   }
   const counts=wallSides.reduce((out,side)=>{
    const key=side.connectivity??'not-standable';out[key]=(out[key]??0)+1;return out;
   },{});
   wallSideWitnesses.push({species:animal.species,animalId:animal.id,
    walls:wallSides.length/2,counts,
    reachable:wallSides.filter(side=>side.connectivity==='accessible').slice(0,16)});
   // Nearest and median are bounded witnesses, not proof about every crop.
   const ordered=[...crops].sort((a,b)=>distance(animal,a)-distance(animal,b)||a.id.localeCompare(b.id));
   const samples=[ordered[0],ordered[Math.floor(ordered.length/2)]].filter((x,i,list)=>x&&list.indexOf(x)===i);
   const options={worker:false,species:animal.species};
   for(const crop of samples){
    const result=nav.regionConnected(animal,crop,animal.radius,null,false);
    const from=session.actorRegions(animal,options),to=session.actorRegions(crop,options);
    let unknownReason=null;
    if(result===null){
     if(from.unknown||to.unknown)unknownReason='incomplete-resident-region';
     else if(!from.ids.length||!to.ids.length)unknownReason='endpoint-without-grid-connector';
     else unknownReason='graph-unresolved-despite-known-endpoints';
    }
    // A plant center need not be a standable attack position. Check a bounded
    // ring at the ordinary crop interaction distance before interpreting an
    // unknown center as evidence of a sealed agricultural region.
    const approachWitnesses=to.ids.length?[]:Array.from({length:8},(_,index)=>{
     const angle=index*Math.PI/4,reach=animal.radius+.6;
     const point={x:crop.x+Math.sin(angle)*reach,z:crop.z+Math.cos(angle)*reach};
     const standable=nav.walkable(point.x,point.z,animal.radius,null,false);
     return {point,standable,connectivity:standable?
       status(nav.regionConnected(animal,point,animal.radius,null,false)):null};
    });
    queries.push({species:animal.species,animalId:animal.id,spawn:animal.spawn,
     targetId:crop.id,target:{x:crop.x,z:crop.z},distance:distance(animal,crop),
     connectivity:status(result),unknownReason,from,to,approachWitnesses,
     enclosure:nav.enclosureFor(crop,animal.radius)});
   }
  }
  return {sourceHash:capture.sourceHash,case:capture.case,raidId:capture.raidId,
   day:capture.day,elapsed:capture.elapsed,activeBounds:bounds,
   raidView:capture.raidView,cropsAlive:crops.length,animals:state.raid.animals.length,
   loadedChunks:loaded.size,queries,wallSideWitnesses,
   caveat:'Offline rebuild loads every chunk in captured activeBounds; results can differ from live residency. Two crop witnesses and wall-center side samples per species do not certify all physical attack positions.'};
 }finally{session.dispose();}
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const path=process.argv[2];if(!path)throw Error('Usage: node probe-raid-connectivity.mjs <raid-probe.json.gz>');
 const capture=JSON.parse(gunzipSync(readFileSync(path))),wasm=new WebAssembly.Module(readFileSync(
  new URL('../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
 console.log(JSON.stringify(probeRaidConnectivity(capture,wasm),null,2));
}
