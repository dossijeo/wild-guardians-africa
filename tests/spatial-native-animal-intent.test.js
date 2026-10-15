import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const row=(op,kind,id,targetKind=0,x=0,z=0,active=0)=>
  [op,kind,id,targetKind,x,z,active,0,0,0];

test('native animal leases preserve committed strikes and reject duplicate targets',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const game=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    let origin,route;
    for(let z=-10;z<=10&&!route;z++)for(let x=-10;x<=10;x++){
      const start={x:x+.2,z:z+.2},end={x:x+1.2,z:z+.2};
      const candidate=session.routeActor(start,end,{worker:false,species:'hyena'});
      if(candidate.status==='found'&&candidate.points.length){origin=start;route=candidate;break;}
    }
    assert(route,'the fixture contains a physical hyena route');
    const wasm=session.core.wasm,end=route.points.at(-1);
    const write=(sequence,rows)=>{
      const ptr=wasm.nav_intent_changes_ptr(rows.length);
      new Float64Array(wasm.memory.buffer,ptr,rows.length*10).set(rows.flat());
      return wasm.nav_intent_apply_changes(sequence,rows.length);
    };
    const register=(actor,target,path=route.points)=>{
      if(path.length){
        const ptr=wasm.nav_intent_attack_route_input_ptr(path.length);
        assert(ptr);
        new Float32Array(wasm.memory.buffer,ptr,path.length*2)
          .set(path.flatMap(point=>[point.x,point.z]));
      }
      return wasm.nav_intent_register_attack(actor,target,
        origin.x,origin.z,path.length);
    };
    wasm.nav_intent_reset();
    assert.equal(write(1,[row(1,2,11,1,end.x,end.z,1),
      row(1,2,12,3,end.x+2,end.z,1),
      row(1,2,13,4,end.x+3,end.z,1)]),1);
    session.actorSectorRevision({worker:false,species:'hyena'});
    assert.equal(register(101,11),1);
    assert.equal(register(102,11),-3,
      'a second animal cannot lease the same crop');
    assert.equal(wasm.nav_intent_actor(101),1);
    const active=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
    const oldHandle=Array.from(active.slice(4,7));
    assert.equal(active[1],1);
    assert(wasm.nav_intent_route_points(...oldHandle)>0);
    assert.equal(register(102,13),1);
    assert.equal(register(103,13),1,
      'a center permits separate animal approaches');
    assert.equal(wasm.nav_intent_attack_action_active(101),1);
    assert.equal(wasm.nav_intent_route_points(...oldHandle),-1,
      'the committed attack no longer retains its travel route');
    assert.equal(write(2,[row(0,2,11)]),1);
    assert.equal(wasm.nav_intent_actor(101),1,
      'target destruction does not erase a committed strike');
    assert.equal(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_actor_ptr(),10)[1],2);
    assert.equal(wasm.nav_intent_attack_finished(101),1,
      'tactical reconsideration is deferred until the hit frame');
    assert.equal(wasm.nav_intent_attack_finished(101),-1,
      'the same strike cannot finish twice');
    assert.equal(wasm.nav_intent_actor(101),0);
    assert.equal(register(104,11),-2,
      'a destroyed crop cannot receive another lease');
    assert.equal(register(104,12),1);
    assert.equal(write(3,[row(0,2,12)]),1);
    assert.equal(wasm.nav_intent_actor(104),0,
      'an uncommitted route is cancelled when its target vanishes');
    assert.equal(wasm.nav_intent_attack_cancel(102),1);
    assert.equal(wasm.nav_intent_attack_cancel(103),1);
  }finally{session.dispose();}
});
