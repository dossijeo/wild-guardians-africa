import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../../../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../../../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../../../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {wallStroke,WALL_UNIT} from '../../../../../src/world/wall-layout.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../../../../src/world/hierarchical-wasm/spatial-movement-profiles.js';

const source=JSON.parse(gunzipSync(readFileSync(new URL(
  '../../../../../tests/fixtures/manglares-123-day17-retreat.json.gz',import.meta.url))));
const state=deserialize(JSON.stringify(source.state));
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../../../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
 for(let cz=-3;cz<=2;cz++)for(let cx=0;cx<=5;cx++){
  if(session.core.selectChunk(cx,cz)<0)session.core.addChunk(cx,cz);
  loaded.set(`${cx},${cz}`,session.core.chunkPayload());
 }
 const nav=createSpatialNavigationMovement(session,state);
 const bounds=[72,-18,102,18],points=[[72,-18],[102,-18],[102,18],[72,18],[72,-18]];
 const missing=wallStroke(points,state.structures,{smooth:false,snap:false});
 const radius=Math.min(...Object.values(ANIMAL_SPATIAL_PROFILES).map(p=>p.radius));
 const rows=missing.map(slot=>{
  const half=WALL_UNIT*slot.scaleX/2,c=Math.cos(slot.angle),s=Math.sin(slot.angle);
  const probes=Math.max(2,Math.ceil(half*2/.25));
  const samples=Array.from({length:probes+1},(_,i)=>{
   const along=-half+half*2*i/probes;
   return {x:slot.x+c*along,z:slot.z+s*along};
  });
  const walkable=samples.filter(p=>nav.walkable(p.x,p.z,radius,null,false));
  return {x:slot.x,z:slot.z,angle:slot.angle,scaleX:slot.scaleX,
   walkableSamples:walkable.length,totalSamples:samples.length};
 });
 const gapSummary={bounds,wallCount:state.structures.filter(s=>s.kind==='wall'&&s.status!=='ruined').length,
  radius,missing:rows.length,barrierSlots:rows.filter(r=>!r.walkableSamples).length,
  passableSlots:rows.filter(r=>r.walkableSamples).length,rows};
 const origins=state.raid.animals.filter(a=>a.species==='warthog').map(a=>a.spawn);
 const crops=state.plants.filter(p=>p.alive);
 const counts={found:0,blocked:0,unknown:0};let witness=null;
 for(const origin of origins.slice(0,5))for(const crop of crops){
  const route=session.routeActor(origin,crop,{worker:false,species:'warthog'});
  counts[route.status]=(counts[route.status]??0)+1;
  if(route.status==='found'&&!witness)witness={origin,crop:{id:crop.id,x:crop.x,z:crop.z},
   points:route.points};
  if(witness)break;
 }
 const crossing=witness?.points.findIndex(p=>p.x<=102&&p.z>=-18&&p.z<=18)??-1;
 const near=crossing>=0?witness.points.slice(Math.max(0,crossing-3),crossing+4):[];
 const walls=near.length?state.structures.filter(s=>s.kind==='wall'&&
   Math.hypot(s.x-near[3]?.x,s.z-near[3]?.z)<4).map(s=>({id:s.id,x:s.x,z:s.z,
    status:s.status,hp:s.hp,gate:s.gate})):[];
 console.log(JSON.stringify({sourceHash:source.sourceHash,day:state.day,gapSummary,
  route:{counts,witness:witness&&{origin:witness.origin,crop:witness.crop,
   routePoints:witness.points.length,crossing,near,walls}}},null,2));
}finally{session.dispose();}
