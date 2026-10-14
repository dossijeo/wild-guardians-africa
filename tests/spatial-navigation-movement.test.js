import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {villageLayout} from '../src/world/villages.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'))[0];

test('movement contract uses only native profiles, topology and physically checked routes',async()=>{
  const state={seed:'712',biome:'sabana',villages:[{id:'village-1',x:0,z:0,
    buildings:villageLayout(pack,0,0)}],structures:[],spells:[],suppressed:[]};
  const installed=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>installed,onData:data=>installed.set(`${data.cx},${data.cz}`,data)});
  try{
    session.stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}],
      ['1,0',{cx:1,cz:0,score:1}]]));
    await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    assert.equal(nav.field,session.field);
    assert.equal(nav.suppressed,session.suppressed);
    assert.equal(nav.state,state);
    assert.deepEqual(nav.propsAt(0,0,4),session.queryPropsAt(0,0,4).props);
    const visible=[...installed.values()].flatMap(chunk=>chunk.instances.flat())[0];
    assert(visible);
    state.suppressed.push(visible.id);session.syncState(state);
    assert.equal(nav.propsAt(visible.x,visible.z,0).some(prop=>prop.id===visible.id),false);
    assert.throws(()=>nav.propsAt(480,0,1),error=>
      error instanceof SpatialChunkUnavailable&&error.missing.length>0);
    let crossing;
    for(let z=-18;z<=18&&!crossing;z++){
      const start={x:23.8,z},end={x:24.2,z};
      if(nav.path(start,end,.28,null,true)&&nav.path(start,end,1.1,null,false))
        crossing={start,end};
    }
    assert(crossing,'worker and animal should find an open chunk seam');
    assert(nav.walkable(crossing.start.x,crossing.start.z,.28,null,true));
    assert(nav.walkable(crossing.start.x,crossing.start.z,1.1,null,false));
    assert(nav.segmentClear(crossing.start,crossing.end,.28,null,true));
    const before=nav.version;
    state.structures.push({id:'wall-1',kind:'wall',material:'adobe',status:'intact',
      x:23.5,z:crossing.start.z,yaw:0,baseScaleX:1,hp:100,gate:false});
    session.syncState(state);
    assert(nav.version>before);
    assert.equal(nav.segmentClear(crossing.start,crossing.end,.28,null,true),false);
    assert.equal(nav.segmentClear(crossing.start,crossing.end,1.1,null,false),false);
    state.structures[0].status='ruined';session.syncState(state);
    assert(nav.segmentClear(crossing.start,crossing.end,.28,null,true));
    assert.throws(()=>nav.path(crossing.start,{x:480,z:0}),SpatialChunkUnavailable);
    assert.throws(()=>nav.walkable(0,0,.6,null,true),/Unsupported worker radius/);
    assert.throws(()=>nav.path(crossing.start,crossing.end,1.2,null,false),/Unsupported animal radius/);
    assert.throws(()=>nav.path(crossing.start,crossing.end,.28,'wall-1',true),
      /target exclusion/);
  }finally{session.dispose();}
});

test('worker movement keeps the live gate leaf collision outside the native route graph',()=>{
  const gate={id:'gate-1',kind:'wall',material:'empalizada',gate:true,
    x:0,z:0,yaw:0,baseScaleX:1,hp:100,maxHp:100,status:'intact',gateOpen:0};
  const state={structures:[gate]};
  const session={field:{},suppressed:new Set(),topologySource:{revision:()=>1},
    actorCanStand:()=>true,actorStepClear:()=>true,
    routeActor:(_start,end)=>({status:'found',points:[end]})};
  const nav=createSpatialNavigationMovement(session,state);
  const start={x:.05,z:-2},end={x:.05,z:2};
  assert.equal(nav.segmentClear(start,end,.28,null,true),true,
    'the graph checks the open gate frame');
  assert.equal(nav.workerMotionClear(start,end),false);
  gate.gateOpen=.5;assert.equal(nav.workerMotionClear(start,end),false);
  gate.gateOpen=1;assert.equal(nav.workerMotionClear(start,end),true);
  gate.status='ruined';assert.equal(nav.workerMotionClear(start,end),true);
});

test('a saved suppression survives reload while its owning chunk is not resident',async()=>{
  const state={seed:'712',biome:'sabana',villages:[{id:'village-1',x:0,z:0,
    buildings:villageLayout(pack,0,0)}],structures:[],spells:[],suppressed:[]};
  const firstChunks=new Map(),first=createSpatialGameSession(module,state,{
    loaded:()=>firstChunks,onData:data=>firstChunks.set(`${data.cx},${data.cz}`,data)});
  first.stream.plan(new Map([['1,0',{cx:1,cz:0,score:0}]]));
  await first.stream.whenIdle();
  const removed=firstChunks.get('1,0').instances.flat()[0];
  assert(removed,'fixture needs a visible prop in the distant chunk');
  first.dispose();
  state.suppressed=[removed.id];
  const restoredChunks=new Map(),restored=createSpatialGameSession(module,state,{
    loaded:()=>restoredChunks,onData:data=>restoredChunks.set(`${data.cx},${data.cz}`,data)});
  try{
    assert.equal(restored.core.metrics().loadedChunks,1);
    restored.stream.plan(new Map([['1,0',{cx:1,cz:0,score:0}]]));
    await restored.stream.whenIdle();
    assert.equal(restoredChunks.get('1,0').instances.flat()
      .some(prop=>prop.id===removed.id),false);
    const nav=createSpatialNavigationMovement(restored,state);
    assert.equal(nav.propsAt(removed.x,removed.z,0)
      .some(prop=>prop.id===removed.id),false);
  }finally{restored.dispose();}
});
