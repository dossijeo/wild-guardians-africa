import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createCropGrouping} from '../src/simulation/crop-components.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from '../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {villageLayout} from '../src/world/villages.js';
import * as Game from '../src/simulation/game.js';

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
  bridge.applyEvents(game,[{type:'target',entity:plant}]);
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
  let ring;
  for(let z=-14;z<=14&&!ring;z+=4)for(let x=-14;x<=14&&!ring;x+=4){
   const candidate=[[x,z],[x+8,z],[x+8,z+8],[x,z+8],[x,z]];
   const quote=Game.previewWallChain(game,'zarzas',candidate,nav,{smooth:false,snap:false});
   if(quote.gates===1&&quote.pieces.length>=12)ring=candidate;
  }
  assert(ring);
  assert.equal(Game.buildWallChain(game,'group-ring','zarzas',ring,nav,
   {smooth:false,snap:false}),true);
  let inside;
  for(let z=ring[0][1]+2;z<ring[2][1]-1&&!inside;z+=1.5)
   for(let x=ring[0][0]+2;x<ring[2][0]-1&&!inside;x+=1.5)
    if(nav.placement(x,z,.4).valid)inside={x,z};
  assert(inside);
  assert.equal(Game.plant(game,'group-crop','mijo',inside.x,inside.z,nav),true);
  const bridge=createSpatialIntentBridge(session);
  bridge.resetFromState(game);
  const before=bridge.getUnprotectedCropGroups({includeProtected:true});
  assert.equal(before.length,1);
  assert.equal(before[0].protection,'protected',JSON.stringify(before[0].profiles));
  const wall=game.structures.find(item=>item.kind==='wall'&&!item.gate);
  const candidates=game.structures.filter(item=>item.kind==='wall'&&!item.gate)
   .sort((a,b)=>Math.hypot(a.x-wall.x,a.z-wall.z)-
    Math.hypot(b.x-wall.x,b.z-wall.z));
  const removed=[];
  for(const candidate of candidates){
   assert.equal(Game.removeWall(game,`group-breach-${removed.length}`,candidate.id,nav),true);
   removed.push(candidate.id);
   if(nav.enclosureFor(inside,1.1).status!=='sealed')break;
  }
  assert.notEqual(nav.enclosureFor(inside,1.1).status,'sealed',
   'the native graph must first confirm a physical breach');
  bridge.applyEvents(game,removed.map(id=>({type:'target',remove:true,id})));
  const after=bridge.getUnprotectedCropGroups({includeProtected:true});
  assert.notEqual(after[0].protection,'protected');
 }finally{session.dispose();}
});
