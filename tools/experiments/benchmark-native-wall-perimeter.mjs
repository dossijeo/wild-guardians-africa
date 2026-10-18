import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {deserialize} from '../../src/persistence/snapshots.js';

// Use the same frozen day-ten state for before/after candidate WASM builds.
// This measures the native candidate query only; it does not time Game.tick.
const candidate=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
if(!candidate)throw Error('WILD_ENGINE_NATIVE_ROUTE_WASM required');
const bytes=readFileSync(candidate),module=new WebAssembly.Module(bytes);
const state=deserialize(gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/sabana712-d10-native-unknown-enclosure.json.gz',
  import.meta.url))).toString());
const loaded=new Map();
const session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  createEventDrivenTaskPlanner(session).resetFromState(state);
  const animal=state.raid.animals[0],wasm=session.core.wasm;
  session.actorSectorRevision({worker:false,species:animal.species});
  const groups=wasm.nav_intent_crop_groups(animal.radius);
  const rows=new Float64Array(wasm.memory.buffer,
    wasm.nav_intent_crop_groups_ptr(),groups*12);
  const ids=Array.from({length:groups},(_,i)=>rows[i*12]);
  const run=()=>{
    let candidates=0;
    for(const id of ids){
      const result=wasm.nav_intent_perimeter_walls(animal.x,animal.z,
        animal.radius,id);
      if(result===1)candidates+=wasm.nav_intent_perimeter_wall_count();
    }
    return candidates;
  };
  const firstStart=performance.now(),firstCount=run();
  const firstMs=performance.now()-firstStart;
  const samples=[];
  for(let i=0;i<100;i++){
    const start=performance.now();
    if(run()!==firstCount)throw Error('Candidate count changed');
    samples.push(performance.now()-start);
  }
  samples.sort((a,b)=>a-b);
  console.log(JSON.stringify({
    fixture:'sabana712-d10-native-unknown-enclosure',
    wasmSha256:createHash('sha256').update(bytes).digest('hex'),
    groups,candidates:firstCount,firstMs,medianMs:samples[49],
    p95Ms:samples[94],totalWarmMs:samples.reduce((a,b)=>a+b,0),
    ...(wasm.nav_intent_wall_portal_builds?
      {portalBuilds:wasm.nav_intent_wall_portal_builds()}:{}),
  }));
}finally{session.dispose();}
