import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createCropGrouping} from '../src/simulation/crop-components.js';
import {createPlant} from '../src/simulation/crops.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createSpatialIntentBridge,createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {createCropEnclosurePlanner} from '../src/world/wild-engine/spatial-crop-enclosure-plan.js';
import {villageLayout} from '../src/world/villages.js';
import {rational,numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';

test('game event observers retain every committed event beyond the capped log and detach cleanly',()=>{
 const state=Game.newGame({seed:712}),received=[];
 const stop=Game.observeGameEvents(state,event=>received.push(event.id));
 for(let i=0;i<250;i++)Game.emit(state,'SpatialTest',{index:i});
 assert.equal(received.length,250);
 assert.equal(state.events.length,200);
 assert.equal(received[0],'event-1');
 assert.equal(state.events[0].id,'event-51');
 stop();
 Game.emit(state,'SpatialTest',{index:250});
 assert.equal(received.length,250);
});

const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'))[0];
const load=()=>deserialize(gunzipSync(readFileSync(new URL(
 './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());

function referenceGroups(plants){
 const grouping=createCropGrouping(plants),seen=new Set(),groups=[];
 for(const plant of grouping.living)if(!seen.has(plant.id)){
  const group=grouping.group(plant);
  for(const crop of group)seen.add(crop.id);
  groups.push(group.map(crop=>crop.id).sort().join(','));
 }
 return groups.sort();
}

test('native crop groups share the game adjacency rule and invalidate only on crop events',
 {skip:!module&&'Build and select the spatial-services WASM first'},()=>{
 const game=load(),session=createSpatialGameSession(module,game,{loaded:()=>new Map()});
 try{
  const bridge=createSpatialIntentBridge(session),wasm=session.core.wasm;
  bridge.resetFromState(game);
  const groups=bridge.getUnprotectedCropGroups({includeProtected:true});
  assert.deepEqual(groups.map(group=>group.cropIds.slice().sort().join(',')).sort(),
   referenceGroups(game.plants));
  assert.ok(groups.every(group=>group.value>0&&group.revision.crops>0));
  assert.ok(groups.every(group=>Object.keys(group.profiles).length===5));
  assert.deepEqual(bridge.getUnprotectedCropGroups({includeProtected:true}),groups);
  const cropRevision=wasm.nav_intent_crop_revision();
  const topology=wasm.nav_intent_topology_revision();
  const wall=game.structures.find(item=>item.kind==='wall');
  wall.hp=Math.max(0,wall.hp-1);
  bridge.applyEvents(game,[{type:'structureDamage',entity:wall}]);
  assert.equal(wasm.nav_intent_crop_revision(),cropRevision);
  assert.deepEqual(bridge.getUnprotectedCropGroups({includeProtected:true}).map(group=>group.cropIds),
   groups.map(group=>group.cropIds));

  const plant=game.plants.find(item=>item.alive);
  plant.alive=false;
  bridge.applyCommittedEvents(game,[{type:'CropPicked',targetId:plant.id}]);
  assert.equal(wasm.nav_intent_crop_revision(),cropRevision+1);
  assert.equal(wasm.nav_intent_topology_revision(),topology);
  const after=bridge.getUnprotectedCropGroups({includeProtected:true});
  assert.deepEqual(after.map(group=>group.cropIds.slice().sort().join(',')).sort(),
   referenceGroups(game.plants));
  assert.ok(after.every(group=>!group.cropIds.includes(plant.id)));
  bridge.resetFromState(deserialize(serialize(game)));
  assert.deepEqual(bridge.getUnprotectedCropGroups({includeProtected:true}).map(group=>group.cropIds),
   after.map(group=>group.cropIds));
 }finally{session.dispose();}
});

test('a paid closed wall ring protects the crop; removing a wall invalidates certification',
 {skip:!module&&'Build and select the spatial-services WASM first'},async()=>{
 const game=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'crop-group-enclosure'});
 game.villages[0].buildings=villageLayout(pack,0,0);
 game.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
  villageId:'village-1',status:'intact',hp:600,maxHp:600});
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const jobs=new Map();
  for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
   jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,game);
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);
  let ring,ringPlan;
  for(let z=-14;z<=14&&!ring;z+=4)for(let x=-14;x<=14&&!ring;x+=4){
   const candidate=[[x,z],[x+8,z],[x+8,z+8],[x,z+8],[x,z]];
   const quote=Game.previewWallChain(game,'zarzas',candidate,nav,{smooth:false,snap:false});
   if(quote.gates===1&&quote.pieces.length>=12){ring=candidate;ringPlan=quote;}
  }
  assert(ring);
  const expectedCost=ringPlan.cost;
  ringPlan.cost=0; // A caller cannot forge a cheaper prepared purchase.
  assert.equal(Game.buildWallChain(game,'group-ring','zarzas',ring,nav,
   {smooth:false,snap:false,preparedPlan:ringPlan}),true);
  assert.equal(Number(game.ledger.entries['group-ring'].n),-expectedCost);
  bridge.applyCommittedEvents(game,[game.events.at(-1)]);
  assert.throws(()=>Game.buildWallChain(game,'group-stale','zarzas',ring,nav,
   {smooth:false,snap:false,preparedPlan:ringPlan}),/caducado/);
  let inside;
  for(let z=ring[0][1]+2;z<ring[2][1]-1&&!inside;z+=1.5)
   for(let x=ring[0][0]+2;x<ring[2][0]-1&&!inside;x+=1.5)
    if(nav.placement(x,z,.4).valid)inside={x,z};
  assert(inside);
  assert.equal(Game.plant(game,'group-crop','mijo',inside.x,inside.z,nav),true);
  bridge.applyCommittedEvents(game,[game.events.at(-1)]);
  let neighbor;
  for(let dz=-1.5;dz<=1.5&&!neighbor;dz+=.3)
   for(let dx=-1.5;dx<=1.5&&!neighbor;dx+=.3){
    const distance=Math.hypot(dx,dz),x=inside.x+dx,z=inside.z+dz;
    if(distance>1.1&&distance<1.7&&nav.placement(x,z,.4).valid)
     neighbor={x,z};
   }
  assert(neighbor,'a second legal crop must share the protected group');
  assert.equal(Game.plant(game,'group-crop-2','mijo',neighbor.x,neighbor.z,nav),true);
  bridge.applyCommittedEvents(game,[game.events.at(-1)]);
  const before=bridge.getUnprotectedCropGroups({includeProtected:true});
  assert.equal(before.length,1);
  assert.equal(before[0].cropIds.length,2);
  assert.equal(before[0].protection,'protected',JSON.stringify(before[0].profiles));
  const planner=createEventDrivenTaskPlanner(session);planner.resetFromState(game);
  const stopWorld=planner.observeWorld(game),changes=[];
  const stopProtection=planner.observeCropProtection(change=>changes.push(change));
  assert.equal(planner.getUnprotectedCropGroups({includeProtected:true})[0].protection,
   'protected');
  const wall=game.structures.find(item=>item.kind==='wall'&&!item.gate);
  wall.hp-=1;
  Game.emit(game,'StructureHit',{targetId:wall.id});
  planner.flushWorldEvents();
  assert.equal(changes.length,0,'HP loss without a topology change is not a breach');
  const candidates=game.structures.filter(item=>item.kind==='wall'&&!item.gate)
   .sort((a,b)=>Math.hypot(a.x-wall.x,a.z-wall.z)-
    Math.hypot(b.x-wall.x,b.z-wall.z));
  game.plants.find(plant=>plant.id===before[0].cropIds[0]).alive=false;
  Game.emit(game,'CropDestroyed',{targetId:before[0].cropIds[0]});
  const removed=[];
  for(const candidate of candidates){
   assert.equal(Game.removeWall(game,`group-breach-${removed.length}`,candidate.id,nav),true);
   removed.push(candidate.id);
   if(nav.enclosureFor(inside,1.1).status!=='sealed')break;
  }
  assert.notEqual(nav.enclosureFor(inside,1.1).status,'sealed',
   'the native graph must first confirm a physical breach');
  assert.equal(changes.length,0,'confirmed wall events wait for the event boundary');
  planner.flushWorldEvents();
  const after=planner.getUnprotectedCropGroups({includeProtected:true});
  assert.notEqual(after[0].protection,'protected');
  assert.notEqual(after[0].id,before[0].id,
   'the destroyed anchor changes the native group identity');
  assert.deepEqual(changes.map(change=>({groupId:change.groupId,
   previous:change.previous,protection:change.protection})),[{groupId:after[0].id,
   previous:'protected',protection:after[0].protection}]);
  planner.flushWorldEvents();
  assert.equal(changes.length,1,'an unchanged topology cannot repeat the notification');
  let outside;
  for(let z=-12;z<=12&&!outside;z+=2)
   for(let x=-12;x<=12&&!outside;x+=2)
    if(Math.hypot(x-inside.x,z-inside.z)>10&&nav.placement(x,z,.4).valid)
     outside={x,z};
  assert(outside,'a legal new agricultural group must be available');
  assert.equal(Game.plant(game,'new-exposed-crop','mijo',outside.x,outside.z,nav),true);
  planner.flushWorldEvents();
  const added=planner.getUnprotectedCropGroups({includeProtected:true})
   .find(group=>group.cropIds.includes(game.events.at(-1).targetId));
  assert.equal(added.protection,'unprotected');
  assert.deepEqual(changes.at(-1)&&{groupId:changes.at(-1).groupId,
   previous:changes.at(-1).previous,protection:changes.at(-1).protection},
   {groupId:added.id,previous:null,protection:'unprotected'});
  planner.flushWorldEvents();
  assert.equal(changes.length,2,'the new group is notified only once');
  stopProtection();stopWorld();
 }finally{session.dispose();}
});

test('enclosure advice quotes real wall modules and never certifies an incomplete ring',
 {skip:!module&&'Build and select the spatial-services WASM first'},async()=>{
 const game=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'crop-plan'});
 game.villages[0].buildings=villageLayout(pack,0,0);
 game.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
  villageId:'village-1',status:'intact',hp:600,maxHp:600});
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const jobs=new Map();
  for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
   jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,game);
  let site;
  for(let z=-12;z<=12&&!site;z+=3)for(let x=-12;x<=12&&!site;x+=3)
   if(nav.placement(x,z,.4).valid)site={x,z};
  assert(site);
  assert.equal(Game.plant(game,'plan-crop','mijo',site.x,site.z,nav),true);
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);
  const group=bridge.getUnprotectedCropGroups()[0];
  assert(group);
  const planner=createCropEnclosurePlanner(game,nav,bridge);
  const previewRevision=()=>{session.actorCanStand({x:0,z:0},{worker:true});return {stamp:session.routeStamp(),
    route:session.core.wasm.lazy_route_revision(),
    sectors:session.core.wasm.lazy_sector_updates()};};
  const beforePreview=previewRevision();
  const plan=planner.planCropEnclosure(group.id);
  assert.deepEqual(previewRevision(),beforePreview,
    'Rectangular advice must not mutate confirmed native topology');
  assert.equal(plan.groupId,group.id);
  assert.equal(plan.status,'ready',JSON.stringify({status:plan.status,reason:plan.reason,
   cost:plan.cost,modules:plan.modules?.length,gaps:plan.gaps?.length}));
  if(plan.status==='ready'){
   assert.ok(plan.modules.length>0);
   assert.equal(plan.cost,plan.modules.reduce((sum,piece)=>sum+piece.cost,0));
   assert.equal(bridge.getUnprotectedCropGroups({includeProtected:true})[0].protection,
    'unprotected','speculative preview must leave the live graph unchanged');
   const existing=plan.modules.find(piece=>!piece.gate);
   assert(existing);
   game.structures.push(existing);game.nextId++;
   nav.setState(game);
   bridge.applyEvents(game,[{type:'target',entity:existing}]);
   const incremental=planner.planCropEnclosure(group.id);
   assert.equal(incremental.status,'ready',JSON.stringify({status:incremental.status,
    reason:incremental.reason}));
   assert.ok(incremental.cost<plan.cost,'existing walls must lower incremental cost');
   assert.ok(!incremental.modules.some(piece=>Math.hypot(piece.x-existing.x,
    piece.z-existing.z)<.35));
  }
 }finally{session.dispose();}
});

test('missing sectors cannot certify a proposed perimeter',
 {skip:!module&&'Build and select the spatial-services WASM first'},()=>{
 const game=Game.newGame({seed:712,biome:'sabana',slotId:'unknown-crop-plan'});
 game.villages[0].buildings=villageLayout(pack,0,0);
 game.plants.push(createPlant('plant-2','mijo',8,8,null));
 const session=createSpatialGameSession(module,game,{loaded:()=>new Map()});
 try{
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);
  const nav=createSpatialNavigationMovement(session,game);
  const group=bridge.getUnprotectedCropGroups()[0];
  assert(group);
  assert.equal(group.protection,'unknown');
  const plan=createCropEnclosurePlanner(game,nav,bridge).planCropEnclosure(group.id);
  assert.notEqual(plan.status,'ready');
  assert.notEqual(plan.status,'protected');
 }finally{session.dispose();}
});

test('a center-adjacent crop uses valid animal attack sites to certify its enclosure',
 {skip:!module&&'Build and select the spatial-services WASM first'},async()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-d2-enclosure-connectors.json.gz',import.meta.url))).toString());
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const jobs=new Map();
  for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++)
   jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.hypot(x,z)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,game);
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);
  const group=bridge.getUnprotectedCropGroups()[0];
  assert.equal(group.id,'crop:plant-106');
  assert.equal(group.cropIds.length,68);
  assert.equal(group.protection,'unprotected');
  const b=group.bounds,margin=2.5;
  const points=[[b.minX-margin,b.minZ-margin],[b.maxX+margin,b.minZ-margin],
   [b.maxX+margin,b.maxZ+margin],[b.minX-margin,b.maxZ+margin],
   [b.minX-margin,b.minZ-margin]];
  const before=serialize(game);
  const quote=Game.quoteWallChain(game,'zarzas',points,nav,
   {smooth:false,snap:false});
  assert.equal(quote.expectedSlots.length,36);
  assert.equal(quote.pieces.length,35);
  assert.equal(quote.blockedPieces.length,1,
   'one physical obstacle substitutes for a wall module');
  const after=nav.withWallPreview(quote.previewPieces,quote.suppressed,()=>{
   const draft=createSpatialIntentBridge(session);
   draft.resetFromState(game);
   return draft.getUnprotectedCropGroups({includeProtected:true})
    .find(item=>item.id===group.id);
  },true);
  assert.equal(after.protection,'protected',JSON.stringify(after.profiles));
  assert(Object.values(after.profiles).every(status=>status==='protected'));
  assert.equal(bridge.getUnprotectedCropGroups()[0].protection,'unprotected',
   'the speculative barrier must not certify the live world');
  assert.equal(serialize(game),before);
  game.ledger.balance=rational(1000); // Explicit fixture credit for the paid-command check.
  assert.equal(Game.buildWallChain(game,'group-center-ring','zarzas',points,nav,
   {smooth:false,snap:false}),true);
  assert.equal(numberOf(game.ledger.balance),650);
  assert.equal(game.structures.filter(item=>item.kind==='wall').length,35);
  bridge.applyCommittedEvents(game,[game.events.at(-1)]);
  const paid=bridge.getUnprotectedCropGroups({includeProtected:true})
   .find(item=>item.id===group.id);
  assert.equal(paid.protection,'protected',JSON.stringify(paid.profiles));
  assert(Object.values(paid.profiles).every(status=>status==='protected'));
 }finally{session.dispose();}
});
