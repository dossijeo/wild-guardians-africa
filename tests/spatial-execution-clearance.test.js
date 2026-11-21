import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function fixture(biome='desierto'){
 const state=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 state.biome=biome;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
  if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
  loaded.set(`${x},${z}`,session.core.chunkPayload());
 }
 session.actorSectorRevision({worker:false,species:'warthog'});
 const wasm=session.core.wasm,clear=(a,b,radius=1.1)=>
  wasm.spatial_execution_segment_clear(a.x,a.z,b.x,b.z,radius);
 return {state,session,wasm,clear,nav:createSpatialNavigationMovement(session,state)};
}
function segment(f){
 for(let z=-10;z<=10;z++)for(let x=-10;x<=10;x++){
  const start={x:x+.2,z:z+.2},end={x:x+1.2,z:z+.2};
  if(f.clear(start,end)===1)return {start,end};
 }
 assert.fail('fixture requires a continuously clear native segment');
}

test('native execution sweep catches a polygon intrusion between old 0.2 m samples',()=>{
 const f=fixture();
 try{
  const {start,end}=segment(f),mid={x:start.x+.1,z:start.z},r=1.1;
  const polygon=f.session.core.addPolygon([
   {x:mid.x-.0001,z:mid.z+r-.0001},{x:mid.x+.0001,z:mid.z+r-.0001},
   {x:mid.x+.0001,z:mid.z+r+.5},{x:mid.x-.0001,z:mid.z+r+.5},
  ]);
  assert(polygon>0);
  f.session.actorSectorRevision({worker:false,species:'warthog'});
  assert.equal(f.wasm.spatial_local_clear(start.x,start.z,end.x,end.z),1,
   'regression must remain invisible to the existing fixed-distance samples');
  assert.equal(f.wasm.spatial_local_clear(mid.x,mid.z,mid.x,mid.z),0,
   'the old actual-landing guard would reject this precise position');
  assert.equal(f.clear(start,end),0,
   'the native execution owner must reject the entire connector before replay');
 }finally{f.session.dispose();}
});

test('accepted continuous Desert sweeps preserve legacy terrain, fluid and point guards',()=>{
 const f=fixture();
 try{
  let accepted=0;
  for(let z=-10;z<=10&&accepted<12;z+=2)for(let x=-10;x<=10&&accepted<12;x+=2){
   const a={x:x+.13,z:z+.27},b={x:x+2.71,z:z+1.83};
   if(f.clear(a,b)!==1)continue;
   accepted++;
   for(let i=0;i<=240;i++){
    const point={x:a.x+(b.x-a.x)*i/240,z:a.z+(b.z-a.z)*i/240};
    assert(f.nav.terrainValid(point.x,point.z,1.1,false),'legacy slope/footprint guard');
    assert(!f.nav.field.fluidInside(point.x,point.z),'Desert remains dry');
    assert(f.nav.walkable(point.x,point.z,1.1,null,false),'legacy native landing guard');
   }
  }
  assert.equal(accepted,12,'exercise multiple native terrain cells and triangle boundaries');
 }finally{f.session.dispose();}
});

test('continuous execution clearance is a read-only admission operation, not a route planner',()=>{
 const f=fixture();
 try{
  const {start,end}=segment(f),before=f.session.core.snapshot(),
   queries=f.wasm.nav_intent_route_queries(),checks=f.wasm.spatial_execution_clearance_checks();
  assert.equal(f.clear(start,end),1);
  assert.equal(f.wasm.spatial_execution_clearance_checks(),checks+1);
  assert(f.wasm.spatial_execution_slope_samples()>0);
  assert.equal(f.wasm.nav_intent_route_queries(),queries);
  assert.deepEqual(f.session.core.snapshot(),before);
  assert.equal(f.clear({x:10000,z:10000},{x:10000,z:10000}),-1,'missing residence is unknown');
  assert.equal(f.clear(start,{x:Infinity,z:0}),-3);
  assert.equal(f.clear(start,end,.28),-3,'profile/radius mismatch cannot inherit a proof');
 }finally{f.session.dispose();}
});

test('unsupported execution classes are explicit rather than falsely authorized',()=>{
 const f=fixture('sabana');
 try{assert.equal(f.clear({x:0,z:0},{x:1,z:0}),-2);}
 finally{f.session.dispose();}
});
