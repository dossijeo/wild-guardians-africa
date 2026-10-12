import {createOpeningWorld} from '../tools/check_opening.mjs';
import {spawnRaid,updateRaid,chooseRaidEntry} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {resolveAgriculturalImpact} from '../src/simulation/raid-agricultural-impact.js';
import {readFileSync} from 'node:fs';
import {findInitialLocation,findInitialLocationAsync} from '../src/world/villages.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {canyonLandAccess} from '../src/world/canyon-land-access.js';
import {actorFluidClear} from '../src/simulation/actor-fluid-clearance.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {rational} from '../src/simulation/money.js';

function world(fluidInside){
 const nav=new Navigation(712,'gran-canon',{});
 nav.field={canyon:true,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside,waterInfo:(x,z)=>({inside:fluidInside(x,z),level:0})};
 nav.propsAt=()=>[];const s=Game.newGame({seed:712,biome:'gran-canon'});nav.setState(s);return {s,nav};
}
test('animals detour on land around a finite river; workers cross directly',()=>{
 const {nav}=world((x,z)=>Math.abs(x)<1&&Math.abs(z)<6),a={x:-5,z:0},b={x:5,z:0};
 assert(nav.segmentClear(a,b,.28,null,true));assert(!nav.segmentClear(a,b,.28,null,false));
 const path=nav.path(a,b,1.1,null,false,16);assert(path);let previous=a;
 for(const p of path){assert(nav.segmentClear(previous,p,1.1,null,false));assert(actorFluidClear(nav,p,1.1));previous=p;}
 assert(path.some(p=>Math.abs(p.z)>=6));
});
test('river completes a paid U perimeter without water wall pieces and preserves worker access on reload',()=>{
 const {s,nav}=world(x=>x>=9);s.villages[0].entry={x:-4,z:4};
 Game.placeStructure(s,'center',{x:-10,z:-10},nav);Game.plant(s,'crop','mijo',4,4,nav);
 Game.buildWallChain(s,'bank-wall','zarzas',[[10,0],[0,0],[0,8],[10,8]],nav,{smooth:false,snap:false});
 const walls=s.structures.filter(w=>w.kind==='wall'),gates=walls.filter(w=>w.autoGate);
 assert.equal(gates.length,1);assert(gates[0].x<9);
 assert(walls.every(w=>nav.wallPlacement(w).valid));assert(!walls.some(w=>w.x>10));
 assert.equal(s.ledger.entries['bank-wall'].n,String(-10*walls.length));
 assert(nav.path(s.villages[0].entry,s.plants[0],.28,null,true));
 assert(gatePortalPoints(gates[0]).every(p=>nav.walkable(p.x,p.z,.28,null,true)));
 assert(!nav.path({x:11,z:4},s.plants[0],1.1,null,false));
 const saved=deserialize(serialize(s)),frozen=serialize(saved);assert.equal(serialize(deserialize(frozen)),frozen);nav.setState(saved);
 assert(nav.path({x:8,z:4},{x:12,z:4},.28,null,true));assert(!nav.segmentClear({x:8,z:4},{x:12,z:4},1.1,null,false));
});

test('a mixed river and cliff perimeter creates a door on the last paid stroke and preserves it after rebuilding',()=>{
 const {s,nav}=world(x=>x>=9);s.ledger.balance=rational(20000);
 nav.field.surface=(_x,z)=>Math.max(0,z-9)*20;nav.setState(s);
 s.villages[0].entry={x:-4,z:4};
 Game.placeStructure(s,'mixed-center',{x:-10,z:-10},nav);Game.plant(s,'mixed-crop','mijo',4,4,nav);
 const options={smooth:false,snap:false};
 assert(Game.buildWallChain(s,'river-base','zarzas',[[10,0],[0,0]],nav,options));
 assert.equal(s.structures.filter(w=>w.autoGate).length,0);
 const older=structuredClone(s.structures);
 assert(Game.buildWallChain(s,'cliff-close','piedra',[[0,0],[0,10]],nav,options));
 const gates=s.structures.filter(w=>w.autoGate);assert.equal(gates.length,1);
 const gate=structuredClone(gates[0]);assert.equal(gate.material,'piedra');
 assert.deepEqual(s.structures.slice(0,older.length),older);
 assert(gatePortalPoints(gate).every(p=>nav.walkable(p.x,p.z,.28,null,true)));
 assert(nav.path(s.villages[0].entry,s.plants[0],.28,null,true));
 const wall=s.structures.find(w=>w.kind==='wall'&&!w.gate);
 assert(Game.removeWall(s,'mixed-remove',wall.id,nav));
 assert(Game.placeStructure(s,'mixed-rebuild',{kind:'wall',material:'adobe',x:wall.x,z:wall.z,yaw:wall.yaw},nav));
 assert.equal(s.structures.filter(w=>w.autoGate).length,1);
 assert.deepEqual(s.structures.find(w=>w.id===gate.id),gate);
 const loaded=deserialize(serialize(s));nav.setState(loaded);
 assert.equal(loaded.structures.filter(w=>w.autoGate).length,1);
 assert(Game.removeWall(loaded,'mixed-gate-remove',gate.id,nav));
 const unchanged=structuredClone(loaded.structures);
 assert(Game.placeStructure(loaded,'mixed-gate-rebuild',{kind:'wall',material:'empalizada',x:gate.x,z:gate.z,yaw:gate.yaw},nav));
 assert.deepEqual(loaded.structures.slice(0,unchanged.length),unchanged);
 assert.equal(loaded.structures.filter(w=>w.autoGate).length,1);assert(loaded.structures.at(-1).autoGate);
});
test('land-access witness rejects a naturally isolated farm and accepts a verified same-bank approach',()=>{
 const {nav}=world((x,z)=>Math.hypot(x,z)>5);assert.equal(canyonLandAccess(nav,[{x:0,z:0}]),null);
 nav.field.fluidInside=x=>x<0;nav.field.waterInfo=(x,z)=>({inside:x<0,level:0});nav.setState({structures:[],villages:[],spells:[],suppressed:[]});
 const witness=canyonLandAccess(nav,[{x:5,z:0}]);assert(witness);assert(Math.hypot(witness.entry.x-5,witness.entry.z)>=31.99);
 let previous=witness.entry;for(const point of witness.path){assert(nav.segmentClear(previous,point,witness.radius,null,false));previous=point;}
});

test('a real area impact cannot damage crops on the opposite river bank',()=>{
 const {s,nav}=world(x=>Math.abs(x)<.3);
 s.plants=[{id:'contact',species:'mijo',alive:true,x:-1.4,z:0},{id:'far-bank',species:'mijo',alive:true,x:1.4,z:0}];nav.setState(s);
 const animal={id:'animal',x:-2,z:0,radius:1.1,heading:Math.PI/2,attackId:'physical-river-hit',damageProfile:{cropDamage:2,structureDamage:30,attackRadius:3.6,areaCap:7,peripheralWeight:.5}};
 const fact=resolveAgriculturalImpact(s,animal,s.plants[0],nav);
 assert.deepEqual(fact.hits.map(h=>h.targetId),['contact']);assert.equal(s.plants[0].alive,false);assert.equal(s.plants[1].alive,true);assert.equal(s.plants[1].attackHits,undefined);
});

test('cooperative canyon initialization preserves the deterministic synchronous site',async()=>{
 const profile=JSON.parse(readFileSync('public/content/biome-canyons.json')).profile,payload=JSON.parse(readFileSync('public/content/villages.json')).find(p=>p.id==='mapungubwe');
 const original=new Navigation(712,'gran-canon',profile),asyncNav=new Navigation(712,'gran-canon',profile),site=findInitialLocation(original,payload);
 let turns=0;const timer=setInterval(()=>turns++,1);let prepared;
 try{prepared=await findInitialLocationAsync(asyncNav,payload);}finally{clearInterval(timer);}
 assert.deepEqual(prepared,site);assert.deepEqual(asyncNav.config,original.config);assert(turns>0,'new land-access queries must yield to the existing loading loop');
});

test('native mixed canyon waves retain all 16 dry bodies without overlap and deterministic placement',()=>{
 const {s,nav}=createOpeningWorld({biome:'gran-canon',culture:'saheliana',slotId:'canyon-wave-test'}),center=s.structures[0],rng=s.rng;
 const group=Array.from({length:16},(_,i)=>['warthog','hyena','buffalo','lion','rhino'][i%5]),specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
 const bounds=[center.x-128,center.z-128,center.x+128,center.z+128],entry=chooseRaidEntry(s,specs,bounds,0,nav);assert(entry);assert.equal(entry.entries.length,16);assert.equal(s.rng,rng);
 assert.deepEqual(chooseRaidEntry(s,specs,bounds,0,nav),entry);
 for(let i=0;i<16;i++){
  assert(nav.walkable(entry.entries[i].x,entry.entries[i].z,specs[i].radius,null,false));assert(nav.segmentClear(entry.entries[i],entry.exits[i],specs[i].radius,null,false));
  for(let j=0;j<i;j++)assert(Math.hypot(entry.entries[i].x-entry.entries[j].x,entry.entries[i].z-entry.entries[j].z)>specs[i].radius+specs[j].radius+1);
 }
});
test('a native canyon column physically arrives and attacks, with no water landings',()=>{
 const {s,nav}=createOpeningWorld({biome:'gran-canon',culture:'saheliana',slotId:'canyon-native-contact'});
 assert(spawnRaid(s,{group:Array(12).fill('warthog')},nav));assert.equal(s.raid.animals.length,12);
 let steps=0;while(s.raid&&!s.events.some(e=>e.type==='StructureHit')&&steps++<1000){
  s.elapsed+=.1;updateRaid(s,.1,nav);
  for(const a of s.raid?.animals??[])assert(actorFluidClear(nav,a,a.radius));
 }
 assert(s.events.some(e=>e.type==='StructureHit'),'the land entry must produce an actual animated native hit');
});
