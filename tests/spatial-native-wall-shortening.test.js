import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';

const module=new WebAssembly.Module(readFileSync(
  process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

test('Manglares wall approaches retain physical routes after bounded shortening',async()=>{
  const saved=readFileSync(new URL(
    'fixtures/manglares712-d48-wall-planner.json.gz',import.meta.url));
  const state=deserialize(gunzipSync(saved).toString());
  const loaded=new Map();
  const session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data),
  });
  try{
    const center=state.structures.find(piece=>piece.kind==='center'&&
      piece.status==='intact'&&piece.hp>0);
    assert(center);
    const cx=Math.floor((center.x+24)/48),cz=Math.floor((center.z+24)/48);
    const desired=new Map();
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)
      desired.set(`${cx+dx},${cz+dz}`,{
        cx:cx+dx,cz:cz+dz,score:Math.hypot(dx,dz)});
    session.stream.plan(desired);
    await session.stream.whenIdle();
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    const wasm=session.core.wasm;
    // The saved raid's old leases are cancelled only in this disposable native
    // session. Each actor must acquire a new, physically validated wall route.
    for(const animal of state.raid.animals)
      wasm.nav_intent_attack_cancel(Number(animal.id.split('-').at(-1)));
    wasm.nav_intent_attack_blockers_ptr(0);
    wasm.nav_intent_attack_reserved_targets_ptr(0);
    const walls=new Set(state.structures.filter(wall=>wall.kind==='wall'&&
      wall.status==='intact').map(wall=>Number(wall.id.split('-').at(-1))));
    for(const animal of state.raid.animals.slice(0,4)){
      session.actorSectorRevision({worker:false,species:animal.species});
      const actorId=Number(animal.id.split('-').at(-1));
      assert.equal(wasm.nav_intent_plan_attack_wall(actorId,animal.x,
        animal.z,animal.radius),1);
      const row=new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_wall_attack_result_ptr(),10);
      assert(walls.has(row[1]));
      const count=wasm.nav_intent_route_points(row[4],row[5],row[6]);
      assert(count>0);
      const path=new Float32Array(wasm.memory.buffer,
        wasm.nav_intent_route_ptr(row[4],row[5],row[6]),count*2);
      assert(path.every(Number.isFinite));
      assert(Math.hypot(path.at(-2)-row[2],path.at(-1)-row[3])<1e-3);
    }
  }finally{session.dispose();}
});
