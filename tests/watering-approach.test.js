import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {wateringRoute} from '../src/world/work-points.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function flat(state){const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(state);return nav;}
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

test('Water approaches avoid blocked near-side terrain and every segment remains physically traversable',()=>{
 const s=Game.newGame({seed:712,slotId:'obstacle-approach'}),nav=flat(s),plant={id:'crop',x:0,z:0,species:'platano'},worker={x:0,z:3};
 nav.obstacles=[{id:'rock',kind:'house',x:0,z:1.03,radius:.3}];
 const route=wateringRoute(worker,plant,nav);assert.ok(route);assert.notEqual(route.destination.x,0);assert.ok(Math.hypot(route.destination.x,route.destination.z)>1);
 let previous=worker;for(const point of route.path){assert.ok(nav.segmentClear(previous,point,.28,null,true));previous=point;}
 nav.field={blocked:()=>true,slope:()=>0};nav.walkCache.clear();assert.equal(wateringRoute(worker,plant,nav),null);
});
