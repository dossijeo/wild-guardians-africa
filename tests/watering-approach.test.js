import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {wateringRoute,canWaterFrom} from '../src/world/work-points.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';

function flat(state){const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(state);return nav;}
test('watering cannot bridge a canyon cliff even when horizontal coordinates are close',()=>{const plant={id:'mesa',species:'mijo',x:0,z:0},worker={x:.83,z:0,radius:.28},nav={field:{surface:(x,z)=>Math.hypot(x,z)<.5?15:3},workerSurface:()=>3,walkable:()=>true,path:(_a,b)=>[b]};assert.equal(canWaterFrom(worker,plant,nav),false);assert.equal(wateringRoute(worker,plant,nav),null);nav.field.surface=()=>3;assert.equal(canWaterFrom(worker,plant,nav),true);assert.ok(wateringRoute(worker,plant,nav));});
test('a saved watering action on the wrong elevation never irrigates or starts growth',()=>{const s=Game.newGame({seed:712,slotId:'mesa-water'});Game.resume(s,'intro');const nav=flat(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{youngFemale:1});s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};const plant=s.plants[0],worker=s.workers[0],task=s.tasks.find(t=>t.kind==='initial');worker.x=plant.x+.83;worker.z=plant.z;worker.taskId=task.id;task.workerId=worker.id;worker.status='acting';worker.actionRemaining=.01;nav.workerSurface=()=>0;nav.field.surface=(x,z)=>Math.hypot(x-plant.x,z-plant.z)<.5?12:0;const loaded=deserialize(serialize(s)),fresh=flat(loaded);fresh.workerSurface=nav.workerSurface;fresh.field.surface=nav.field.surface;Game.tick(loaded,.05,fresh);assert.equal(loaded.plants[0].water[0].status,'due');assert.equal(loaded.plants[0].growth,0);assert.equal(loaded.events.some(e=>e.type==='WaterSatisfied'),false);assert.ok(loaded.tasks.some(t=>t.id===task.id));});
test('a legally planted native canyon plateau crop stays dormant without a physical worker route',()=>{
 const {s,nav}=createOpeningWorld({biome:'gran-canon',slotId:'native-plateau-water'}),center=s.structures[0];let point;
 for(let offset=30;offset<=70&&!point;offset+=2){const candidate={x:nav.field.riverX(center.z)+offset,z:center.z};if(nav.placement(candidate.x,candidate.z,.4).valid&&nav.field.surface(candidate.x,candidate.z)>nav.field.riverLevel+8)point=candidate;}
 assert.ok(point,'native plateau must admit a seed');Game.plant(s,'plateau-seed','mijo',point.x,point.z,nav);Game.openInitialHiring(s);Game.hire(s,'paid-worker',{youngFemale:1});s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};
 const plant=s.plants[0];assert.equal(wateringRoute(s.workers[0],plant,nav),null);
 for(let i=0;i<3000&&s.time<300;i++)Game.tick(s,.1,nav);
 assert.equal(plant.growth,0);assert.equal(plant.water[0].status,'due');assert.equal(s.events.some(e=>e.type==='WaterSatisfied'&&e.targetId===plant.id),false);assert.ok(s.tasks.some(t=>t.targetId===plant.id&&t.kind==='initial'));
});
for(const profile of ['olderMale','olderFemale','youngMale','youngFemale'])test(`${profile}: paid first watering stands outside the crop and faces it; reload preserves the approach`,()=>{
 const s=Game.newGame({seed:712,slotId:'watering-approach-'+profile});Game.resume(s,'intro');const nav=flat(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{[profile]:1});s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};
 const w=s.workers[0],plant=s.plants[0];for(let i=0;i<2000&&w.status!=='acting';i++)Game.tick(s,.05,nav);
 assert.equal(w.status,'acting');assert.equal(s.tasks.find(t=>t.id===w.taskId).kind,'initial');
 assert.ok(Math.hypot(w.x-plant.x,w.z-plant.z)>=.82);assert.equal(w.heading,Math.atan2(plant.x-w.x,plant.z-w.z));
 assert.equal(plant.water[0].status,'due');assert.equal(plant.growth,0);
 const loaded=deserialize(serialize(s)),fresh=flat(loaded);for(let i=0;i<170;i++){Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);}
 assert.equal(serialize(loaded),serialize(s));assert.equal(plant.water[0].status,'manual');assert.equal(s.events.filter(e=>e.type==='WaterSatisfied').length,1);
});

test('watering approaches avoid solid obstacles, allow fluid and reject inaccessible slopes',()=>{
 const s=Game.newGame({seed:712,slotId:'obstacle-approach'}),nav=flat(s),plant={id:'crop',x:0,z:0,species:'platano'},worker={x:0,z:3};
 nav.obstacles=[{id:'rock',kind:'house',x:0,z:1.03,radius:.3}];
 const route=wateringRoute(worker,plant,nav);assert.ok(route);assert.notEqual(route.destination.x,0);assert.ok(Math.hypot(route.destination.x,route.destination.z)>1);
 let previous=worker;for(const point of route.path){assert.ok(nav.segmentClear(previous,point,.28,null,true));previous=point;}
 nav.field={blocked:()=>true,slope:()=>0,surface:()=>0};nav.walkCache.clear();
 const fluidRoute=wateringRoute(worker,plant,nav);assert.ok(fluidRoute);
 previous=worker;for(const point of fluidRoute.path){assert.ok(nav.segmentClear(previous,point,.28,null,true));previous=point;}
 nav.field.slope=()=>.6;nav.walkCache.clear();nav.segmentCache.clear();
 assert.equal(wateringRoute(worker,plant,nav),null);
});
