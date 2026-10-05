import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Navigation} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {cropSpec} from '../src/simulation/rules.js';
const fixture=new URL('../docs/qa/intensive-post-jam-b0d19a5/manglares-saheliana-failure/manglares-saheliana-failure-state.json.gz',import.meta.url);
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-mangrove.json',import.meta.url),'utf8')).profile;
function recorded(){
 const s=deserialize(gunzipSync(readFileSync(fixture)).toString());
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);return {s,nav};
}
test('recorded native Manglares day 65: replant inside the remaining shield charges once and queues initial watering',()=>{
 const {s,nav}=recorded(),occupied=new Set(s.plants.filter(p=>p.alive).map(p=>`${p.x},${p.z}`));
 // Recover the strategy plot order from first use; historical plants are retained.
 const plots=[...new Map(s.plants.map(p=>[`${p.x},${p.z}`,{x:p.x,z:p.z}])).values()];
 const p=plots.find(p=>!occupied.has(`${p.x},${p.z}`));assert.deepEqual(p,{x:60,z:-12});
 const shield=s.spells.find(a=>a.kind==='shield');assert.ok(shield.remaining>0);const spellBefore=structuredClone(shield);
 assert.equal(nav.placement(p.x,p.z,.4).valid,true);
 const cash=numberOf(s.ledger.balance),tasks=structuredClone(s.tasks),count=s.plants.length;
 Game.plant(s,'shield-replant','batata',p.x,p.z,nav);
 const plant=s.plants.at(-1);assert.equal(s.plants.length,count+1);assert.equal(plant.alive,true);
 assert.equal(numberOf(s.ledger.balance),cash-cropSpec('batata').plant_cost);
 assert.deepEqual(s.tasks.slice(0,-1),tasks);assert.equal(s.tasks.at(-1).kind,'initial');assert.equal(s.tasks.at(-1).targetId,plant.id);
 assert.deepEqual(s.spells.find(a=>a.kind==='shield'),spellBefore);
 const saved=serialize(s);
 const loaded=deserialize(saved),restored=new Navigation(loaded.seed,loaded.biome,profile);restored.setState(loaded);
 assert.equal(restored.placement(p.x,p.z,.4).valid,true);assert.deepEqual(loaded.tasks,s.tasks);
 assert.equal(restored.testWalkable(p.x,p.z,.28,null,true),true);
 assert.equal(restored.testWalkable(p.x,p.z,.28,null,false),false);
});
function isolated(obstacle,fluid=false){
 const nav=new Navigation(712,'sabana',{});
 nav.field={surface:()=>0,slope:()=>0,waterInfo:()=>({inside:fluid,level:1})};nav.propsAt=()=>[];nav.obstacles=[obstacle];return nav;
}
const polygon=[{x:-.5,z:-.5},{x:.5,z:-.5},{x:.5,z:.5},{x:-.5,z:.5}];
const building={x:0,z:0,radius:1,kind:'center',footprint:polygon};
const wall={x:0,z:0,yaw:0,material:'madera'};
for(const kind of ['shield','house','center'])test(`${kind}: point, footprint and wall occupancy use physical buildings only`,()=>{
 const nav=isolated({id:'obstacle',kind,x:0,z:0,radius:4});
 for(const result of [nav.placement(0,0,.4),nav.placementFootprint(building),nav.wallPlacement(wall)])assert.equal(result.valid,kind==='shield');
 assert.equal(nav.testWalkable(0,0,.28,null,false),false);
 assert.equal(nav.testWalkable(0,0,.28,null,true),kind==='shield');
});
test('shield does not override water/lava or solid vegetation placement restrictions',()=>{
 const shield={id:'shield',kind:'shield',x:0,z:0,radius:4},nav=isolated(shield,true);
 for(const result of [nav.placement(0,0,.4),nav.placementFootprint(building),nav.wallPlacement(wall)]){assert.equal(result.valid,false);assert.equal(result.fluid,true);}
 nav.field.waterInfo=()=>({inside:false});nav.propsAt=()=>[{id:'tree',slot:0,x:0,z:0,radius:2}];
 for(const result of [nav.placement(0,0,.4),nav.placementFootprint(building),nav.wallPlacement(wall)])assert.equal(result.valid,false);
});
