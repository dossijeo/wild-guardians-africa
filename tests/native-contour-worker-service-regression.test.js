import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {wateringRoute,canWaterFrom} from '../src/world/work-points.js';
import {centerServicePoint,centerDeliveryPoint} from '../src/world/centers.js';
import * as Game from '../src/simulation/game.js';
import {nativeWorkerServiceProof} from '../tools/native-worker-service-proof.mjs';
const root=new URL('../docs/qa/integrated-spiritual-survival/',import.meta.url);
function fixture(){
 const s=deserialize(gunzipSync(readFileSync(new URL('pilot-v97-q14-good-zarzas-canyon-712-seven/partial-state.json.gz',root))).toString());
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const contour=JSON.parse(readFileSync(new URL('canyon-q14-predefeat-shore-refined-v2.json',root))).rows[5];
 const quote=Game.quoteWallChain(s,'zarzas',contour.candidate.points,nav,{smooth:false,snap:false});
 const view=nav.forBuildingPlacement({id:'qa-empty',x:1e12,z:1e12,radius:0,kind:'house'},quote.suppressed??[]);
 const updates=new Map(quote.updates.map(p=>[p.id,p]));view.obstacles=[...nav.obstacles.map(p=>updates.has(p.id)?{...p,...updates.get(p.id)}:p),...quote.pieces];
 return {s,nav,view,quote};
}
test('retained Canyon contour permits native watering although first worker cannot route to crop centre',()=>{
 const {s,nav,view,quote}=fixture(),before=serialize(s),worker=s.workers.find(w=>!w.incapacitated&&w.status!=='home');
 const plant=s.plants.find(p=>p.alive&&view.walkable(p.x,p.z,.28,null,true));
 assert.equal(worker.id,'worker-2161');assert.equal(quote.pieces.length,56);
 for(const v of [nav,view]){
  assert.equal(v.path(worker,plant,.28,null,true,32),null);
  const service=wateringRoute(worker,plant,v);assert(service);assert(canWaterFrom({...service.destination,radius:.28},plant,v));
 }
 for(const crop of s.plants.filter(p=>p.alive)){
  const center=s.structures.find(c=>c.id===crop.centerId),start=centerServicePoint(center,s,.8);
  const water=wateringRoute({...start,radius:.28},crop,view);assert(water,crop.id);
  assert(canWaterFrom({...water.destination,radius:.28},crop,view));
  assert(view.path(water.destination,centerDeliveryPoint(center,crop,s,.8),.28,null,true,32),crop.id);
 }
 assert.equal(serialize(s),before);
});
test('native watering route still rejects a crop surrounded by a solid footprint',()=>{
 const {s,view}=fixture(),before=serialize(s),worker=s.workers.find(w=>w.id==='worker-2161'),plant=s.plants.find(p=>p.alive);
 const blocked=view.forBuildingPlacement({id:'service-blocker',kind:'house',x:plant.x,z:plant.z,radius:5,
  footprint:[{x:plant.x-5,z:plant.z-5},{x:plant.x+5,z:plant.z-5},{x:plant.x+5,z:plant.z+5},{x:plant.x-5,z:plant.z+5}]});
 assert.equal(wateringRoute(worker,plant,blocked),null);
 assert.equal(serialize(s),before);
});
test('experimental worker service proof checks all live actors and all living crops',()=>{
 const {s,view}=fixture(),before=serialize(s),proof=nativeWorkerServiceProof(s,view);
 assert(proof.valid);assert.equal(proof.checks.workers.length,10);assert.equal(proof.checks.crops.length,123);
 assert.equal(serialize(s),before);
});
test('experimental service proof does not accept missing workers or an orphan crop',()=>{
 const {s,view}=fixture();
 const missing={...s,workers:[]};assert.equal(nativeWorkerServiceProof(missing,view).reason,'worker-passage-not-observable');
 const orphan={...s,plants:s.plants.map(p=>p.alive?{...p,centerId:'missing-centre'}:p)};
 const rejected=nativeWorkerServiceProof(orphan,view);assert.equal(rejected.valid,false);assert.equal(rejected.reason,'native-crop-centre-not-operational');
});
test('experimental service proof rejects an obstructed route instead of skipping the worker',()=>{
 const {s,view}=fixture();
 const blocked=view.forBuildingPlacement({id:'total-service-blocker',kind:'house',x:-15,z:60,radius:200,
  footprint:[{x:-200,z:-200},{x:200,z:-200},{x:200,z:200},{x:-200,z:200}]});
 const rejected=nativeWorkerServiceProof(s,blocked);assert.equal(rejected.valid,false);
 assert.equal(rejected.reason,'no-clear-worker-service-crop');
});
test('experimental service proof requires the physical return route, not only successful watering',()=>{
 const {s,view}=fixture(),blockedReturn=Object.create(view),path=view.path.bind(view);
 blockedReturn.path=(start,...args)=>start.id?.startsWith('water-point-')?null:path(start,...args);
 const rejected=nativeWorkerServiceProof(s,blockedReturn);
 assert.equal(rejected.valid,false);assert.equal(rejected.reason,'native-crop-delivery-route-unproven');
 assert.equal(rejected.checks.workers.length,10);assert.equal(rejected.checks.crops.length,0);
});
