import test from 'node:test';
import assert from 'node:assert/strict';
import {HiringRoutePreparer} from '../src/world/hiring-route-preparer.js';
import {computeHiringRoutes} from '../src/world/compute-hiring-routes.js';
import {warmRaidNavigation} from '../src/world/raid-navigation-warmth.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
function fixture(options={}){
 const {s,nav}=createOpeningWorld(options),c=s.structures[0];
 for(let z=-9;z<=9&&s.plants.length<8;z+=1.5)for(let x=5;x<=25&&s.plants.length<8;x+=1.5){try{Game.plant(s,'hire-prep-seed-'+s.plants.length,'mijo',Math.round((c.x+x)/1.5)*1.5,Math.round((c.z+z)/1.5)*1.5,nav);}catch{}}
 assert.equal(s.plants.length,8);Game.openInitialHiring(s);s.tutorial.step='done';
 const workers=[],preparer=new HiringRoutePreparer(nav,{createWorker:()=>{const worker={requests:[],postMessage(r){this.requests.push(r);},terminate(){this.terminated=true;}};workers.push(worker);return worker;}});
 return {s,nav,preparer,workers};
}
const choice={olderFemale:1,olderMale:1};
test('first-day worker preparation is read-only and preserves paid tasks, physical work and full trajectory',()=>{
 const {s,nav,preparer,workers}=fixture(),before=serialize(s);preparer.update(s,choice);const worker=workers[0],request=worker.requests[0],reply=computeHiringRoutes(request);
 assert.equal(serialize(s),before);assert.ok(reply.warmth.paths.length>0);assert.ok(reply.warmth.paths.length<=128);assert.ok(reply.warmth.paths.reduce((n,[,p])=>n+p.length,0)<=20000);
 worker.onmessage({data:reply});const ready=preparer.take(s,choice);assert.ok(ready);
 const reference=deserialize(before),referenceNav=new Navigation(s.seed,s.biome,nav.profile);referenceNav.setState(reference);
 Game.hire(s,'actual-hire',choice);Game.hire(reference,'actual-hire',choice);assert.equal(warmRaidNavigation(nav,ready.warmth),true);
 let referenceSearches=0,preparedSearches=0;for(const [n,inc] of [[nav,()=>preparedSearches++],[referenceNav,()=>referenceSearches++]]){const find=n.findPath;n.findPath=function(...args){inc();return find.apply(this,args);};}
 for(let step=0;step<2000;step++){Game.tick(s,.05,nav);Game.tick(reference,.05,referenceNav);assert.equal(serialize(s),serialize(reference),`step ${step}`);}
 assert.ok(preparedSearches<referenceSearches);assert.ok(s.plants.some(p=>p.water[0].status==='manual'));preparer.cancel();assert.equal(worker.terminated,true);assert.equal(preparer.ready,null);preparer.dispose();
});
test('rapid selection changes keep one outstanding job and only the latest request is accepted',()=>{
 const {s,preparer,workers}=fixture();preparer.update(s,choice);const worker=workers[0],first=worker.requests[0];preparer.update(s,{olderFemale:2});preparer.update(s,{olderMale:2});assert.equal(worker.requests.length,1);
 worker.onmessage({data:computeHiringRoutes(first)});assert.equal(preparer.stats.obsolete,1);assert.equal(worker.requests.length,2);assert.deepEqual(worker.requests[1].selection,{olderMale:2});
 worker.onmessage({data:computeHiringRoutes(worker.requests[1])});assert.ok(preparer.take(s,{olderMale:2}));assert.equal(preparer.take(s,{olderMale:2}),undefined);preparer.dispose();
});
for(const changed of ['rng','geometry','selection','clock','state'])test(`${changed}: a previously prepared route cannot survive changed hiring context`,()=>{
 const {s,nav,preparer,workers}=fixture();preparer.update(s,choice);const worker=workers[0];worker.onmessage({data:computeHiringRoutes(worker.requests[0])});
 if(changed==='rng')s.rng++;if(changed==='geometry')nav.setState(s);if(changed==='clock')s.time+=.01;if(changed==='state')s.tutorial.step='observe';
 assert.equal(preparer.take(s,changed==='selection'?{olderFemale:2}:choice),undefined);preparer.dispose();
});
test('zero selection, failures and disposal terminate optional work without touching gameplay',()=>{
 const {s,preparer,workers,nav}=fixture(),before=serialize(s);preparer.update(s,{});assert.equal(workers.length,0);preparer.update(s,choice);const worker=workers[0],request=worker.requests[0];preparer.cancel();worker.onmessage({data:computeHiringRoutes(request)});assert.equal(preparer.ready,null);assert.equal(serialize(s),before);
 preparer.update(s,choice);assert.equal(workers.length,2);preparer.dispose();assert.ok(workers[1].terminated);preparer.update(s,choice);assert.equal(workers.length,2);
 const failed=new HiringRoutePreparer(nav,{createWorker(){throw Error('unavailable');}});failed.update(s,choice);assert.equal(failed.stats.failed,1);assert.equal(serialize(s),before);failed.dispose();
});

test('midday proportional hiring precomputes new-worker routes without changing the paid result',()=>{
 const {s,nav,preparer,workers}=fixture();Game.hire(s,'first-hire',choice);for(let i=0;i<200;i++)Game.tick(s,.05,nav);Game.pause(s,'menu');
 const selection={youngFemale:1},centerId=s.structures[0].id,before=serialize(s);preparer.update(s,selection,centerId);const worker=workers[0],reply=computeHiringRoutes(worker.requests[0]);assert.equal(serialize(s),before);worker.onmessage({data:reply});const ready=preparer.take(s,selection,centerId);assert.ok(ready);
 const reference=deserialize(before),referenceNav=new Navigation(s.seed,s.biome,nav.profile);referenceNav.setState(reference);
 Game.hireAdditional(s,'extra-hire',selection,centerId);Game.hireAdditional(reference,'extra-hire',selection,centerId);Game.resume(s,'menu');Game.resume(reference,'menu');assert.equal(warmRaidNavigation(nav,ready.warmth),true);
 for(let i=0;i<600;i++){Game.tick(s,.05,nav);Game.tick(reference,.05,referenceNav);assert.equal(serialize(s),serialize(reference),`midday step ${i}`);}
 assert.equal(s.workers.length,3);preparer.dispose();
});

test('a cancelled worker error cannot terminate its replacement, and returning to the pending selection drops obsolete queued work',()=>{
 const {s,preparer,workers}=fixture();preparer.update(s,choice);const old=workers[0];preparer.cancel();preparer.update(s,choice);const current=workers[1];old.onerror();assert.equal(current.terminated,undefined);assert.equal(preparer.disabled,undefined);
 preparer.update(s,{olderFemale:2});preparer.update(s,choice);current.onmessage({data:computeHiringRoutes(current.requests[0])});assert.equal(current.requests.length,1);assert.ok(preparer.take(s,choice));preparer.dispose();
});

for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])test(`${biome}: hiring preparation preserves the complete native trajectory`,()=>{
 const {s,nav,preparer,workers}=fixture({biome}),before=serialize(s);
 preparer.update(s,choice);const worker=workers[0];worker.onmessage({data:computeHiringRoutes(worker.requests[0])});
 assert.equal(serialize(s),before);const ready=preparer.take(s,choice);assert.ok(ready);
 const reference=deserialize(before),referenceNav=new Navigation(s.seed,s.biome,nav.profile);referenceNav.setState(reference);
 Game.hire(s,'native-hire',choice);Game.hire(reference,'native-hire',choice);assert.ok(warmRaidNavigation(nav,ready.warmth));
 for(let i=0;i<2000;i++){Game.tick(s,.05,nav);Game.tick(reference,.05,referenceNav);assert.equal(serialize(s),serialize(reference),`${biome} step ${i}`);}
 preparer.dispose();
});
