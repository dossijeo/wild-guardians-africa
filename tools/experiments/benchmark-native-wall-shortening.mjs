import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
// Frozen Manglares/712 night 48, after the 16-animal raid has entered.
// Cancel saved intentions only inside this disposable WASM session so each
// query measures the same wall-planning workload with a fresh actor origin.
// This is a microbenchmark, not a campaign outcome or a balance simulation.
const fixture=process.argv[2]??'tests/fixtures/manglares712-d48-wall-planner.json.gz';
const actors=Number(process.argv[3]??4);
if(!Number.isInteger(actors)||actors<1||actors>16)throw Error('Expected 1–16 actors');
const fixtureBytes=readFileSync(fixture);
const state=deserialize(gunzipSync(fixtureBytes).toString());
const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/wild-engine/spatial-savanna.wasm';
const wasmBytes=readFileSync(binary);
const module=new WebAssembly.Module(wasmBytes);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
console.log(JSON.stringify({phase:'setup',fixture,fixtureSha256:sha256(fixtureBytes),
  wasmSha256:sha256(wasmBytes),actors}));
const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const center=state.structures.find(piece=>piece.kind==='center'&&piece.status==='intact'&&piece.hp>0);
  const cx=Math.floor((center.x+24)/48),cz=Math.floor((center.z+24)/48),desired=new Map();
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)desired.set(`${cx+dx},${cz+dz}`,{cx:cx+dx,cz:cz+dz,score:Math.hypot(dx,dz)});
  session.stream.plan(desired);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state),planner=createEventDrivenTaskPlanner(session);
  nav.setActiveBounds([(cx-1)*48-24,(cz-1)*48-24,(cx+1)*48+24,(cz+1)*48+24]);
  planner.resetFromState(state);nav.intentTaskPlanner=planner;
  const wasm=session.core.wasm;
  for(const animal of state.raid.animals)wasm.nav_intent_attack_cancel(Number(animal.id.split('-').at(-1)));
  wasm.nav_intent_attack_blockers_ptr(0);wasm.nav_intent_attack_reserved_targets_ptr(0);
  const results=[];
  for(const animal of state.raid.animals.slice(0,actors)){
    session.actorSectorRevision({worker:false,species:animal.species});
    const h=wasm.spatial_route_cache_hits(),m=wasm.spatial_route_cache_misses(),start=performance.now();
    const status=wasm.nav_intent_plan_attack_wall(Number(animal.id.split('-').at(-1)),animal.x,animal.z,animal.radius);
    const planMs=performance.now()-start;
    const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_wall_attack_result_ptr(),10));
    const pointCount=status===1?wasm.nav_intent_route_points(row[4],row[5],row[6]):0;
    const path=pointCount>0?Array.from(new Float32Array(wasm.memory.buffer,wasm.nav_intent_route_ptr(row[4],row[5],row[6]),pointCount*2)):[];
    let routeLength=0,px=animal.x,pz=animal.z;
    for(let i=0;i<path.length;i+=2){routeLength+=Math.hypot(path[i]-px,path[i+1]-pz);px=path[i];pz=path[i+1]}
    const result={routeHash:sha256(JSON.stringify(path)),pointCount,
      routeLength,directDistance:Math.hypot(row[2]-animal.x,row[3]-animal.z),
      actor:animal.id,species:animal.species,status,ms:planMs,
      examined:row[8],routes:row[9],
      cacheHits:Number(wasm.spatial_route_cache_hits()-h),
      cacheMisses:Number(wasm.spatial_route_cache_misses()-m),target:row[1]};
    results.push(result);
    console.log(JSON.stringify(result));
  }
  console.log(JSON.stringify({phase:'summary',totalMs:results.reduce((sum,row)=>sum+row.ms,0),
    routeQueries:results.reduce((sum,row)=>sum+row.routes,0),
    memoryBytes:wasm.memory.buffer.byteLength}));
}finally{session.dispose()}
