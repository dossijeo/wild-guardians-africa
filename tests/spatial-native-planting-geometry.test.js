import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import * as Game from '../src/simulation/game.js';
import {villageLayout} from '../src/world/villages.js';

const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'))[0];
const load=()=>deserialize(gunzipSync(readFileSync(new URL(
 './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());

test('native crop-site geometry never certifies an illegal resident placement',
 {skip:!module&&'Build and select the spatial-services WASM first'},async()=>{
 const game=load(),loaded=new Map();
 const session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const jobs=new Map();
  for(let cz=-1;cz<=1;cz++)for(let cx=0;cx<=2;cx++)
   jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx-1,cz)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,game);
  assert.equal(session.core.wasm.spatial_crop_placement_valid(10000,10000),-1,
   'unloaded terrain cannot be certified vacant');
  let valid=0,unknown=0,falseNegative=0;
  for(let z=-15;z<=15;z+=1.5)for(let x=70.5;x<=96;x+=1.5){
   const native=session.core.wasm.spatial_crop_placement_valid(x,z);
   const expected=nav.placement(x,z,.4).valid;
   if(native<0){unknown++;continue;}
   if(native===1){valid++;assert(expected,`false positive at ${x},${z}`);}
   if(native===0&&expected)falseNegative++;
  }
  assert(valid>0);
  assert.equal(unknown,0,'all sampled sectors are resident');
  assert(falseNegative<valid/3,`too many conservative misses: ${falseNegative}/${valid}`);
 }finally{session.dispose();}
});

test('native crop-site classification is conservative across all six biomes',
 {skip:!module&&'Build and select the spatial-services WASM first'},async()=>{
 for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
  const game=Game.newGame({seed:712,biome,culture:'mapungubwe',slotId:`crop-site-${biome}`});
  game.villages[0].buildings=villageLayout(pack,0,0);
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
   loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
   const jobs=new Map();
   for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
    jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
   session.stream.plan(jobs);await session.stream.whenIdle();
   const nav=createSpatialNavigationMovement(session,game);
   for(let z=-12;z<=12;z+=2)for(let x=-12;x<=12;x+=2){
    const native=session.core.wasm.spatial_crop_placement_valid(x,z);
    assert.notEqual(native,-1,`${biome}: resident ${x},${z} is unknown`);
    if(native===1)assert(nav.placement(x,z,.4).valid,
     `${biome}: native false positive at ${x},${z}`);
   }
  }finally{session.dispose();}
 }
});

test('a site near a chunk edge remains unknown until neighboring prop data is resident',
 {skip:!module&&'Build and select the spatial-services WASM first'},async()=>{
 const game=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'crop-site-edge'});
 game.villages[0].buildings=villageLayout(pack,0,0);
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  session.stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}]]));
  await session.stream.whenIdle();
  assert.equal(session.core.wasm.spatial_crop_placement_valid(22.5,0),-1);
  const jobs=new Map([['0,0',{cx:0,cz:0,score:0}],
   ['1,0',{cx:1,cz:0,score:1}]]);
  session.stream.plan(jobs);await session.stream.whenIdle();
  assert.notEqual(session.core.wasm.spatial_crop_placement_valid(22.5,0),-1);
 }finally{session.dispose();}
});
