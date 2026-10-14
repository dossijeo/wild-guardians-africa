import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialPlacement} from '../src/world/hierarchical-wasm/spatial-placement.js';
import {findSpatialStart} from '../src/world/hierarchical-wasm/spatial-initial-site.js';
import {villageLayout} from '../src/world/villages.js';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

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
    assert.equal(nav.config.biome,'savanna');
    assert.equal(nav.config.seed,'712');
    assert.equal(nav.chunk(0,0).cx,0);
    assert.throws(()=>nav.chunk(100,0),error=>
      error instanceof SpatialChunkUnavailable&&error.missing[0].cx===100);
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
    assert(nav.regionFor(crossing.start,1.1,null,false)?.key);
    assert.equal(nav.regionConnected(crossing.start,crossing.end,1.1,null,false),true);
    assert.equal(nav.regionConnected(crossing.start,{x:480,z:0},1.1,null,false),null,
      'nonresident terrain is unknown, not certified blocked');
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

test('native region adapter distinguishes blocked, possible and unknown connectivity',()=>{
  const state={seed:712,biome:'sabana',structures:[],villages:[]};
  let connection='blocked',regions={ids:[12,7],unknown:false};
  const session={field:{},suppressed:new Set(),topologySource:{revision:()=>1},
    actorCanStand:()=>true,actorStepClear:()=>true,
    routeActor:()=>({status:'blocked',points:[]}),
    actorConnectivity:()=>connection,actorRegions:()=>regions};
  const nav=createSpatialNavigationMovement(session,state);
  const a={x:0,z:0},b={x:4,z:0};
  assert.deepEqual(nav.regionFor(a,.28,null,true),{key:'7|12',ids:[7,12]});
  assert.equal(nav.regionConnected(a,b,.28,null,true),false);
  connection='possible';assert.equal(nav.regionConnected(a,b,.28,null,true),true);
  connection='unknown';assert.equal(nav.regionConnected(a,b,.28,null,true),null);
  regions={ids:[],unknown:true};assert.equal(nav.regionFor(a,.28,null,true),null);
  assert.throws(()=>nav.regionFor({x:Infinity,z:0},.28,null,true),/finite/);
});

test('worker movement keeps the live gate leaf collision outside the native route graph',()=>{
  const gate={id:'gate-1',kind:'wall',material:'empalizada',gate:true,
    x:0,z:0,yaw:0,baseScaleX:1,hp:100,maxHp:100,status:'intact',gateOpen:0};
  const state={structures:[gate],villages:[]};
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

test('a resident but physically blocked endpoint is not mistaken for missing terrain',()=>{
  const state={structures:[],villages:[]};
  const session={field:{canyon:false,surface:()=>0,slope:()=>0},
    suppressed:new Set(),topologySource:{revision:()=>1},
    actorCanStand:point=>point.x!==2,actorStepClear:()=>false,
    routeActor:()=>({status:'unknown',points:[]}),
    queryPropsAt:()=>({status:'ready',props:[]})};
  const nav=createSpatialNavigationMovement(session,state);
  assert.equal(nav.path({x:0,z:0},{x:2,z:0}),null);
  session.queryPropsAt=()=>({status:'unknown',missing:[{cx:1,cz:0}]});
  assert.throws(()=>nav.path({x:0,z:0},{x:2,z:0}),SpatialChunkUnavailable);
});

test('native-backed crop placement checks terrain, structures, props and unknown chunks',async()=>{
  const state={seed:'712',biome:'sabana',villages:[{id:'village-1',x:0,z:0,
    buildings:villageLayout(pack,0,0)}],structures:[],spells:[],suppressed:[]};
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    session.stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}]]));
    await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    assert.throws(()=>nav.placement(480,0,.4),SpatialChunkUnavailable);
    const fluid=Array.from({length:49},(_,i)=>({x:i-24,z:0}))
      .find(point=>session.field.fluidInside(point.x,point.z));
    if(fluid)assert.equal(nav.placement(fluid.x,fluid.z,.4).valid,false);
    let open;
    for(let z=-14;z<=14&&!open;z+=2)for(let x=-14;x<=14&&!open;x+=2)
      if(nav.placement(x,z,.4).valid)open={x,z};
    assert(open,'native chunk should contain usable agricultural ground');
    let buildable;
    for(let z=-14;z<=14&&!buildable;z+=2)for(let x=-14;x<=14&&!buildable;x+=2){
      const wall={kind:'wall',material:'adobe',x,z,yaw:0};
      const footprint={kind:'house',x,z,radius:.6,footprint:[
        {x:x-.5,z:z-.5},{x:x+.5,z:z-.5},
        {x:x+.5,z:z+.5},{x:x-.5,z:z+.5}]};
      if(nav.wallPlacement(wall).valid&&nav.placementFootprint(footprint).valid)
        buildable={wall,footprint};
    }
    assert(buildable,'native terrain should support a wall and a building hull');
    assert.throws(()=>nav.wallPlacement({...buildable.wall,x:480}),SpatialChunkUnavailable);
    assert.throws(()=>nav.placementFootprint({...buildable.footprint,x:480,
      footprint:buildable.footprint.footprint.map(p=>({x:p.x+480,z:p.z}))}),
    SpatialChunkUnavailable);
    const structure={id:'placed-wall',kind:'wall',...open,status:'intact',radius:.7};
    state.structures.push(structure);session.syncState(state);
    assert.equal(nav.placement(open.x,open.z,.4).reason,'La construcción solapa otro edificio');
    assert.equal(nav.placement(open.x,open.z,.4,{ignoreWalls:true}).valid,true);
    const prop=[...loaded.values()].flatMap(chunk=>chunk.instances.flat())
      .find(item=>item.slot<4||(item.slot>=10&&item.slot<=12)||item.slot>=18);
    if(prop&&Math.abs(prop.x)<19&&Math.abs(prop.z)<19){
      assert.equal(nav.placement(prop.x,prop.z,.4).valid,false);
      state.suppressed.push(prop.id);session.syncState(state);
      assert.equal(nav.propsAt(prop.x,prop.z,.4)
        .some(item=>item.id===prop.id),false);
    }
    assert.equal(nav.placement(Number.NaN,0,.4).valid,false);
  }finally{session.dispose();}
});

test('native-backed construction placement checks whole wall traces and building hulls',()=>{
  const field={canyon:false,wetland:false,surface:()=>0,slope:()=>0,
    fluidInside:()=>false};
  const state={structures:[],villages:[]};
  const props=[];
  const placement=createSpatialPlacement({field},state,()=>props);
  const wall={kind:'wall',material:'adobe',x:0,z:0,yaw:0};
  assert.deepEqual(placement.wallPlacement(wall),{valid:true,suppress:[]});
  field.fluidInside=()=>true;
  assert.equal(placement.wallPlacement(wall).fluid,true);
  field.fluidInside=()=>false;
  // A village house exercises the authored polygon collision.
  state.villages.push({buildings:[{kind:'Casa',x:0,z:0,radius:2.8,
    footprint:[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}]}]});
  assert.equal(placement.wallPlacement(wall).reason,'La muralla queda dentro de un edificio');
  state.villages.length=0;
  props.push({id:'stone',x:0,z:0,slot:10,radius:.8});
  assert.equal(placement.wallPlacement(wall).reason,'Un árbol o roca grande ocupa este terreno');
  props.length=0;
  props.push({id:'grass',x:0,z:0,slot:9,radius:.3});
  assert.deepEqual(placement.wallPlacement(wall),{valid:true,suppress:['grass']});
  props.length=0;
  const building={kind:'center',x:0,z:0,radius:2,
    footprint:[{x:-1,z:-1},{x:1,z:-1},{x:1,z:1},{x:-1,z:1}]};
  assert.deepEqual(placement.placementFootprint(building),{valid:true,suppress:[]});
  field.surface=x=>x*.2;
  assert.equal(placement.placementFootprint(building).reason,
    'El edificio necesita suelo nivelado en toda su base');
  field.surface=()=>0;
  field.fluidInside=(x,z)=>x>.5&&z>.5;
  assert.equal(placement.placementFootprint(building).fluid,true);
});

test('a real paid crop action keeps the C++ terrain and prop authority in sync',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'spatial-plant'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    session.stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}]]));
    await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    let site;
    for(let z=-14;z<=14&&!site;z+=1.5)for(let x=-14;x<=14&&!site;x+=1.5){
      const check=nav.placement(x,z,.4);
      if(check.valid&&check.suppress.length===0)site={x,z};
    }
    assert(site,'fixture needs crop ground that does not remove a prop');
    const before=numberOf(state.ledger.balance),revision=nav.version;
    assert.equal(Game.plant(state,'spatial-paid-crop','mijo',site.x,site.z,nav),true);
    assert.equal(state.plants.length,1);
    assert.equal(state.plants[0].x,site.x);
    assert(numberOf(state.ledger.balance)<before,'the real purchase charges its seed');
    assert.equal(nav.version,revision,'a crop on clear ground changes no passability');
    assert.equal(session.core.metrics().loadedChunks,1);
    assert.equal(state.tasks.length,1,'the real crop action enqueues agricultural work');
    let entry;
    for(let dz=-8;dz<=8&&!entry;dz+=2)for(let dx=-8;dx<=8&&!entry;dx+=2){
      const point={x:site.x+dx,z:site.z+dz};
      if(Math.hypot(dx,dz)>5&&nav.walkable(point.x,point.z,.28,null,true)&&
        nav.segmentClear(point,site,.28,null,true))entry=point;
    }
    assert(entry,'the native graph should connect a worker entry to the crop');
    state.villages[0].entry=entry;
    Game.openInitialHiring(state);
    Game.hire(state,'spatial-worker',{olderMale:1});
    const worker=state.workers[0],start={x:worker.x,z:worker.z};
    for(let i=0;i<240;i++)Game.tick(state,.1,nav);
    assert(Math.hypot(worker.x-start.x,worker.z-start.z)>1,
      'a paid worker should move toward a real task on native routes');
    assert(state.events.some(event=>event.type==='WaterSatisfied'),
      'the native route should let the worker finish a physical watering task');
  }finally{session.dispose();}
});

test('real wall purchase and removal update the same rendered native collision world',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'spatial-wall'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    session.stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}]]));
    await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    let site;
    for(let z=-16;z<=16&&!site;z+=2)for(let x=-16;x<=16&&!site;x+=2){
      const wall={kind:'wall',material:'zarzas',gate:true,x,z,yaw:0};
      const a={x,z:z-1.4},b={x,z:z+1.4};
      if(nav.wallPlacement(wall).valid&&
         nav.segmentClear(a,b,1.1,null,false))site={wall,a,b};
    }
    assert(site,'fixture needs a valid clear wall crossing');
    const before=numberOf(state.ledger.balance),revision=nav.version;
    assert.equal(Game.placeStructure(state,'spatial-wall-purchase',site.wall,nav),true);
    assert(numberOf(state.ledger.balance)<before,'the game charges the real wall price');
    assert(nav.version>revision,'the native topology sees the purchase');
    assert.equal(nav.segmentClear(site.a,site.b,1.1,null,false),false,
      'an animal cannot cross the paid wall');
    const wallId=state.structures.at(-1).id;
    assert.equal(Game.removeWall(state,'spatial-wall-removal',wallId,nav),true);
    assert.equal(nav.segmentClear(site.a,site.b,1.1,null,false),true,
      'the same native graph reopens after removing the wall');
    assert.equal(session.core.metrics().loadedChunks,1);
  }finally{session.dispose();}
});

test('ordinary wall placement previews its enclosure on the native world and restores temporary topology',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'spatial-gate-preview'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
    session.stream.plan(jobs);
    await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    let wall;
    for(let z=-16;z<=16&&!wall;z+=2)for(let x=-16;x<=16&&!wall;x+=2){
      const candidate={kind:'wall',material:'zarzas',gate:false,x,z,yaw:0};
      if(nav.wallPlacement(candidate).valid&&
        nav.segmentClear({x,z:z-1.4},{x,z:z+1.4},.28,null,true))wall=candidate;
    }
    assert(wall);
    const a={x:wall.x,z:wall.z-1.4},b={x:wall.x,z:wall.z+1.4};
    assert.equal(Game.placeStructure(state,'native-ordinary-wall',wall,nav),true);
    assert.equal(state.structures.length,2);
    assert.equal(nav.segmentClear(a,b,.28,null,true),false);
    assert.equal(Game.removeWall(state,'native-ordinary-wall-remove',state.structures.at(-1).id,nav),true);
    assert.equal(nav.segmentClear(a,b,.28,null,true),true);
  }finally{session.dispose();}
});

test('a native wall ring creates an automatic door that a worker can cross',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'spatial-auto-gate'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    let points,plan;
    for(let z=-14;z<=14&&!points;z+=4)for(let x=-14;x<=14&&!points;x+=4){
      const ring=[[x,z],[x+8,z],[x+8,z+8],[x,z+8],[x,z]];
      const candidate=Game.previewWallChain(state,'zarzas',ring,nav,{smooth:false,snap:false});
      if(candidate.gates===1&&candidate.pieces.length>=12){points=ring;plan=candidate;}
    }
    assert(points,'native terrain should admit a closed wall ring');
    assert.equal(Game.buildWallChain(state,'native-ring','zarzas',points,nav,{smooth:false,snap:false}),true);
    const gate=state.structures.find(item=>item.autoGate);
    assert(gate,'the real purchase must create an automatic gate');
    const {gatePortalPoints}=await import('../src/world/gate-passages.js');
    const [a,b]=gatePortalPoints(gate);
    assert(a&&b);
    assert(nav.path(a,b,.28,null,true),JSON.stringify({points,gate,a,b,
      standA:nav.walkable(a.x,a.z,.28,null,true),
      standB:nav.walkable(b.x,b.z,.28,null,true),
      clear:nav.segmentClear(a,b,.28,null,true),
      connected:nav.regionConnected(a,b,.28,null,true)}));
    assert(nav.path(b,a,.28,null,true));
    assert.equal(nav.segmentClear(a,b,1.1,null,false),false,
      'the gate remains a rigid barrier for animals');
    assert.equal(nav.path(a,b,1.1,null,false),null,
      'the worker portal must not leak into the animal graph');
    assert.equal(plan.gates,1);
    const restored=deserialize(serialize(state)),otherChunks=new Map();
    const reload=createSpatialGameSession(module,restored,{
      loaded:()=>otherChunks,onData:data=>otherChunks.set(`${data.cx},${data.cz}`,data)});
    try{
      reload.stream.plan(jobs);await reload.stream.whenIdle();
      const reloadedNav=createSpatialNavigationMovement(reload,restored);
      assert(reloadedNav.path(a,b,.28,null,true),
        'the worker-only gate portal must be rebuilt from the saved wall');
      assert.equal(reloadedNav.path(a,b,1.1,null,false),null);
    }finally{reload.dispose();}
  }finally{session.dispose();}
});

test('a native initial site permits the first paid work center through the game action',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'spatial-center'});
  const start=await findSpatialStart(module,state,pack);
  Object.assign(state.villages[0],start.site);
  state.suppressed.push(...start.site.suppress);
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const cx=Math.floor((start.site.center.x+24)/48),
      cz=Math.floor((start.site.center.z+24)/48),jobs=new Map();
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)
      jobs.set(`${cx+dx},${cz+dz}`,{cx:cx+dx,cz:cz+dz,score:Math.hypot(dx,dz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    const before=numberOf(state.ledger.balance);
    assert.equal(Game.placeStructure(state,'spatial-first-center',{
      kind:'center',x:start.site.center.x,z:start.site.center.z},nav),true);
    assert.equal(state.structures.filter(item=>item.kind==='center').length,1);
    assert.equal(numberOf(state.ledger.balance),before-800);
    assert.equal(state.villages[0].entry.x,start.site.entry.x);
  }finally{session.dispose();}
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
